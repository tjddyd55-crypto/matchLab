import "server-only";

import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { validateKrMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { normalizeLoginId } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";
import {
  AuditAction,
  PhoneVerificationAccountType,
  PhoneVerificationPurpose,
  PhoneVerificationStatus,
} from "@/generated/prisma";
import {
  assertProductionUserOtpAllowed,
  canMatchonAuthSmsRealSend,
  loadMatchonPhoneVerificationConfig,
  type MatchonPhoneVerificationConfig,
} from "../config/matchon-phone-verification-config";
import { platformAuthSmsService } from "@/lib/services/platform-auth-sms.service";
import {
  getMatchonAuthSmsE2eCode,
  isMatchonAuthSmsE2eInboxAllowed,
  putMatchonAuthSmsE2eCode,
} from "../e2e/matchon-auth-sms-e2e-inbox";
import { MatchonAuthAligoSmsProvider } from "../providers/matchon-auth-aligo-sms-provider";
import { MatchonAuthMockSmsProvider } from "../providers/matchon-auth-mock-sms-provider";
import type { MatchonAuthSmsProvider } from "../providers/matchon-auth-sms-provider";
import {
  generateMatchonOtpCode,
  generateMatchonVerificationToken,
  hashMatchonOtpCode,
  hashMatchonRequestIp,
  hashMatchonVerificationToken,
  safeEqualHex,
} from "../utils/matchon-phone-otp-crypto";

type GenericRequestResult = {
  requestId: string;
  expiresAt: string;
  resendAvailableAt: string;
  deliveryMode: "mock" | "dry_run" | "live";
};

const ipWindow = new Map<string, number[]>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveProvider(
  config: MatchonPhoneVerificationConfig,
): MatchonAuthSmsProvider {
  if (config.provider === "aligo") {
    return new MatchonAuthAligoSmsProvider(config);
  }
  return new MatchonAuthMockSmsProvider();
}

function deliveryMode(
  config: MatchonPhoneVerificationConfig,
): GenericRequestResult["deliveryMode"] {
  if (config.provider === "mock") return "mock";
  if (!canMatchonAuthSmsRealSend(config)) return "dry_run";
  return "live";
}

function assertIpRate(
  config: MatchonPhoneVerificationConfig,
  ipHash: string | null,
) {
  if (!ipHash) return;
  const now = Date.now();
  const arr = (ipWindow.get(ipHash) ?? []).filter(
    (t) => now - t < 60 * 60_000,
  );
  const lastMinute = arr.filter((t) => now - t < 60_000).length;
  if (lastMinute >= config.maxSendsPerIpPerMinute) {
    throw new AppError(
      "CONFLICT",
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (arr.length >= config.maxSendsPerIpPerHour) {
    throw new AppError(
      "CONFLICT",
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  arr.push(now);
  ipWindow.set(ipHash, arr);
}

function buildSignupSmsBody(code: string, minutes: number): string {
  return `[MATCHON] 회원가입 인증번호는 ${code} 입니다. ${minutes}분 이내에 입력해 주세요.`;
}

function buildPasswordResetSmsBody(code: string, minutes: number): string {
  return `[MATCHON] 비밀번호 재설정 인증번호는 ${code} 입니다. ${minutes}분 이내에 입력해 주세요.`;
}

function buildSmsBody(
  purpose: PhoneVerificationPurpose,
  code: string,
  minutes: number,
): string {
  if (purpose === PhoneVerificationPurpose.password_reset) {
    return buildPasswordResetSmsBody(code, minutes);
  }
  return buildSignupSmsBody(code, minutes);
}

async function loadSendConfig(): Promise<MatchonPhoneVerificationConfig> {
  return platformAuthSmsService.loadPhoneVerificationConfigWithCredentials();
}

function assertProductionUserOtpAllowedWithDiagnostics(
  config: MatchonPhoneVerificationConfig,
) {
  try {
    assertProductionUserOtpAllowed(config);
  } catch (e) {
    platformAuthSmsService.logCredentialDiagnostics(
      e instanceof Error ? e.message : "production_phone_otp_not_ready",
    );
    throw e;
  }
}

async function invalidatePending(phoneNormalized: string, purpose: PhoneVerificationPurpose) {
  await prisma.phoneVerification.updateMany({
    where: {
      phoneNormalized,
      purpose,
      status: PhoneVerificationStatus.pending,
    },
    data: { status: PhoneVerificationStatus.cancelled },
  });
}

export const matchonPhoneVerificationService = {
  getConfig() {
    return loadMatchonPhoneVerificationConfig();
  },

  async requestSignupCode(input: {
    phone: string;
    accountType: "association" | "gym";
    requestIp?: string | null;
  }): Promise<GenericRequestResult> {
    const config = await loadSendConfig();
    if (!config.signupPhoneVerificationEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 본인인증 기능은 준비 중입니다.",
      );
    }
    assertProductionUserOtpAllowedWithDiagnostics(config);
    const phone = validateKrMobile(input.phone);
    if (!phone.ok) {
      throw new AppError("VALIDATION_ERROR", phone.message);
    }
    const accountType =
      input.accountType === "gym"
        ? PhoneVerificationAccountType.gym
        : PhoneVerificationAccountType.association;
    const ipHash = hashMatchonRequestIp(input.requestIp);
    assertIpRate(config, ipHash);

    const hourAgo = new Date(Date.now() - 60 * 60_000);
    const sendCountHour = await prisma.phoneVerification.count({
      where: {
        phoneNormalized: phone.normalized,
        purpose: PhoneVerificationPurpose.signup,
        createdAt: { gte: hourAgo },
      },
    });
    if (sendCountHour >= config.maxSendsPerPhonePerHour) {
      throw new AppError(
        "CONFLICT",
        "인증번호 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const latest = await prisma.phoneVerification.findFirst({
      where: {
        phoneNormalized: phone.normalized,
        purpose: PhoneVerificationPurpose.signup,
        status: PhoneVerificationStatus.pending,
      },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.lastSentAt) {
      const elapsed = Date.now() - latest.lastSentAt.getTime();
      if (elapsed < config.resendCooldownMs) {
        throw new AppError(
          "CONFLICT",
          `인증번호 재발송은 ${Math.ceil((config.resendCooldownMs - elapsed) / 1000)}초 후 가능합니다.`,
        );
      }
    }

    await invalidatePending(phone.normalized, PhoneVerificationPurpose.signup);

    const code = generateMatchonOtpCode(config.codeLength);
    const codeHash = hashMatchonOtpCode({
      code,
      purpose: PhoneVerificationPurpose.signup,
      phoneNormalized: phone.normalized,
      pepper: config.pepper,
    });
    const expiresAt = new Date(Date.now() + config.codeTtlMs);
    const row = await prisma.phoneVerification.create({
      data: {
        phoneNormalized: phone.normalized,
        purpose: PhoneVerificationPurpose.signup,
        accountType,
        codeHash,
        status: PhoneVerificationStatus.pending,
        expiresAt,
        sendCount: 1,
        lastSentAt: new Date(),
        requestIpHash: ipHash,
      },
    });

    const provider = resolveProvider(config);
    const send = await provider.sendVerificationSms({
      phoneNormalized: phone.normalized,
      body: buildSmsBody(
        PhoneVerificationPurpose.signup,
        code,
        Math.round(config.codeTtlMs / 60_000),
      ),
    });
    if (!send.accepted) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.cancelled },
      });
      throw new AppError(
        "INTERNAL",
        "인증번호 발송에 실패했습니다. SMS 서비스 상태를 확인해 주세요.",
      );
    }

    putMatchonAuthSmsE2eCode(config, {
      requestId: row.id,
      phoneNormalized: phone.normalized,
      purpose: PhoneVerificationPurpose.signup,
      code,
    });

    await auditRepository.createAuditLog({
      actorUserId: null,
      action: AuditAction.phone_verification_code_sent,
      targetType: "PhoneVerification",
      targetId: row.id,
      afterData: {
        purpose: "signup",
        accountType,
        deliveryMode: deliveryMode(config),
      },
    });

    return {
      requestId: row.id,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(
        Date.now() + config.resendCooldownMs,
      ).toISOString(),
      deliveryMode: deliveryMode(config),
    };
  },

  async verifySignupCode(input: {
    requestId: string;
    phone: string;
    code: string;
  }): Promise<{ signupVerificationToken: string; expiresAt: string }> {
    const config = await loadSendConfig();
    if (!config.signupPhoneVerificationEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 본인인증 기능은 준비 중입니다.",
      );
    }
    assertProductionUserOtpAllowedWithDiagnostics(config);
    const phone = validateKrMobile(input.phone);
    if (!phone.ok) {
      throw new AppError("VALIDATION_ERROR", phone.message);
    }
    const code = String(input.code ?? "").trim();
    if (!new RegExp(`^\\d{${config.codeLength}}$`).test(code)) {
      throw new AppError("VALIDATION_ERROR", "인증번호 형식이 올바르지 않습니다.");
    }

    const row = await prisma.phoneVerification.findFirst({
      where: {
        id: input.requestId,
        phoneNormalized: phone.normalized,
        purpose: PhoneVerificationPurpose.signup,
      },
    });
    if (!row || row.status !== PhoneVerificationStatus.pending) {
      throw new AppError("CONFLICT", "유효한 인증 요청이 없습니다.");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.expired },
      });
      throw new AppError("CONFLICT", "인증번호가 만료되었습니다.");
    }
    if (row.attemptCount >= config.maxVerifyAttempts) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.locked },
      });
      throw new AppError(
        "CONFLICT",
        "인증 시도 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요.",
      );
    }

    const expected = hashMatchonOtpCode({
      code,
      purpose: PhoneVerificationPurpose.signup,
      phoneNormalized: phone.normalized,
      pepper: config.pepper,
    });
    if (!safeEqualHex(expected, row.codeHash)) {
      const next = row.attemptCount + 1;
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: {
          attemptCount: next,
          status:
            next >= config.maxVerifyAttempts
              ? PhoneVerificationStatus.locked
              : PhoneVerificationStatus.pending,
        },
      });
      await auditRepository.createAuditLog({
        actorUserId: null,
        action: AuditAction.phone_verification_failed,
        targetType: "PhoneVerification",
        targetId: row.id,
        afterData: { purpose: "signup", attemptCount: next },
      });
      throw new AppError("VALIDATION_ERROR", "인증번호가 일치하지 않습니다.");
    }

    const token = generateMatchonVerificationToken();
    const tokenHash = hashMatchonVerificationToken(token, config.pepper);
    const tokenExpires = new Date(Date.now() + config.verificationTokenTtlMs);
    await prisma.phoneVerification.update({
      where: { id: row.id },
      data: {
        status: PhoneVerificationStatus.verified,
        verifiedAt: new Date(),
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: tokenExpires,
      },
    });
    await auditRepository.createAuditLog({
      actorUserId: null,
      action: AuditAction.phone_verification_succeeded,
      targetType: "PhoneVerification",
      targetId: row.id,
      afterData: { purpose: "signup" },
    });
    return {
      signupVerificationToken: token,
      expiresAt: tokenExpires.toISOString(),
    };
  },

  async consumeSignupToken(input: {
    token: string;
    phone: string;
    accountType: "association" | "gym";
  }): Promise<{ phoneNormalized: string; verificationId: string }> {
    const config = loadMatchonPhoneVerificationConfig();
    if (!config.signupPhoneVerificationEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 본인인증 기능은 준비 중입니다.",
      );
    }
    const phone = validateKrMobile(input.phone);
    if (!phone.ok) {
      throw new AppError("VALIDATION_ERROR", phone.message);
    }
    const token = String(input.token ?? "").trim();
    if (!token) {
      throw new AppError(
        "VALIDATION_ERROR",
        "휴대폰 인증을 완료한 후 제출해 주세요.",
      );
    }
    const tokenHash = hashMatchonVerificationToken(token, config.pepper);
    const accountType =
      input.accountType === "gym"
        ? PhoneVerificationAccountType.gym
        : PhoneVerificationAccountType.association;

    const row = await prisma.phoneVerification.findFirst({
      where: {
        verificationTokenHash: tokenHash,
        purpose: PhoneVerificationPurpose.signup,
        phoneNormalized: phone.normalized,
        accountType,
        status: PhoneVerificationStatus.verified,
      },
    });
    if (!row || !row.verificationTokenExpiresAt) {
      throw new AppError(
        "VALIDATION_ERROR",
        "휴대폰 인증이 유효하지 않습니다. 다시 인증해 주세요.",
      );
    }
    if (row.verificationTokenExpiresAt.getTime() < Date.now()) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.expired },
      });
      throw new AppError(
        "CONFLICT",
        "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요.",
      );
    }

    const consumed = await prisma.phoneVerification.updateMany({
      where: {
        id: row.id,
        status: PhoneVerificationStatus.verified,
      },
      data: {
        status: PhoneVerificationStatus.consumed,
        consumedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
      },
    });
    if (consumed.count !== 1) {
      throw new AppError(
        "CONFLICT",
        "이미 사용된 인증입니다. 다시 인증해 주세요.",
      );
    }
    return { phoneNormalized: phone.normalized, verificationId: row.id };
  },

  async requestPasswordResetCode(input: {
    loginId: string;
    phone: string;
    requestIp?: string | null;
  }): Promise<GenericRequestResult> {
    const config = await loadSendConfig();
    if (!config.passwordResetPhoneEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 비밀번호 재설정 기능은 준비 중입니다. 관리자에게 문의해 주세요.",
      );
    }
    assertProductionUserOtpAllowedWithDiagnostics(config);
    const started = Date.now();
    const loginId = normalizeLoginId(String(input.loginId ?? ""));
    const phone = validateKrMobile(input.phone);
    const ipHash = hashMatchonRequestIp(input.requestIp);

    // 계정 열거 방지: 항상 유사한 응답/지연
    const fakeId = createHash("sha256")
      .update(`fake|${loginId}|${phone.ok ? phone.normalized : ""}`)
      .digest("hex")
      .slice(0, 24);
    const fakeExpires = new Date(Date.now() + config.codeTtlMs);
    const fakeResend = new Date(Date.now() + config.resendCooldownMs);
    const generic = (): GenericRequestResult => ({
      requestId: `req_${fakeId}`,
      expiresAt: fakeExpires.toISOString(),
      resendAvailableAt: fakeResend.toISOString(),
      deliveryMode: deliveryMode(config),
    });

    try {
      assertIpRate(config, ipHash);
    } catch {
      await sleep(Math.max(0, 400 - (Date.now() - started)));
      return generic();
    }

    if (!loginId || !phone.ok) {
      await sleep(Math.max(0, 450 - (Date.now() - started)));
      return generic();
    }

    // loginId + normalized phone + authUserId 로 정확히 1계정만 허용
    const candidates = await prisma.user.findMany({
      where: { loginId },
      select: { id: true, phone: true, authUserId: true, role: true },
      take: 5,
    });
    const matches = candidates.filter((u) => {
      if (!u.authUserId) return false;
      const userPhone = u.phone ? validateKrMobile(u.phone) : null;
      return (
        userPhone?.ok === true && userPhone.normalized === phone.normalized
      );
    });

    if (matches.length !== 1) {
      await sleep(Math.max(0, 500 - (Date.now() - started)));
      return generic();
    }
    const user = matches[0]!;

    await invalidatePending(
      phone.normalized,
      PhoneVerificationPurpose.password_reset,
    );

    const code = generateMatchonOtpCode(config.codeLength);
    const codeHash = hashMatchonOtpCode({
      code,
      purpose: PhoneVerificationPurpose.password_reset,
      phoneNormalized: phone.normalized,
      pepper: config.pepper,
    });
    const expiresAt = new Date(Date.now() + config.codeTtlMs);
    const row = await prisma.phoneVerification.create({
      data: {
        phoneNormalized: phone.normalized,
        purpose: PhoneVerificationPurpose.password_reset,
        codeHash,
        status: PhoneVerificationStatus.pending,
        expiresAt,
        sendCount: 1,
        lastSentAt: new Date(),
        loginIdNormalized: loginId,
        userId: user.id,
        requestIpHash: ipHash,
      },
    });

    const provider = resolveProvider(config);
    await provider.sendVerificationSms({
      phoneNormalized: phone.normalized,
      body: buildSmsBody(
        PhoneVerificationPurpose.password_reset,
        code,
        Math.round(config.codeTtlMs / 60_000),
      ),
    });
    putMatchonAuthSmsE2eCode(config, {
      requestId: row.id,
      phoneNormalized: phone.normalized,
      purpose: PhoneVerificationPurpose.password_reset,
      code,
    });
    await auditRepository.createAuditLog({
      actorUserId: user.id,
      action: AuditAction.phone_verification_code_sent,
      targetType: "PhoneVerification",
      targetId: row.id,
      afterData: { purpose: "password_reset", deliveryMode: deliveryMode(config) },
    });

    await sleep(Math.max(0, 450 - (Date.now() - started)));
    return {
      requestId: row.id,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(
        Date.now() + config.resendCooldownMs,
      ).toISOString(),
      deliveryMode: deliveryMode(config),
    };
  },

  async verifyPasswordResetCode(input: {
    requestId: string;
    loginId: string;
    phone: string;
    code: string;
  }): Promise<{ passwordResetToken: string; expiresAt: string }> {
    const config = await loadSendConfig();
    if (!config.passwordResetPhoneEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 비밀번호 재설정 기능은 준비 중입니다. 관리자에게 문의해 주세요.",
      );
    }
    assertProductionUserOtpAllowedWithDiagnostics(config);
    const loginId = normalizeLoginId(String(input.loginId ?? ""));
    const phone = validateKrMobile(input.phone);
    if (!loginId || !phone.ok) {
      throw new AppError("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    const code = String(input.code ?? "").trim();
    if (!new RegExp(`^\\d{${config.codeLength}}$`).test(code)) {
      throw new AppError("VALIDATION_ERROR", "인증번호 형식이 올바르지 않습니다.");
    }

    const row = await prisma.phoneVerification.findFirst({
      where: {
        id: input.requestId,
        purpose: PhoneVerificationPurpose.password_reset,
        phoneNormalized: phone.normalized,
        loginIdNormalized: loginId,
      },
    });
    if (!row || row.status !== PhoneVerificationStatus.pending) {
      throw new AppError("CONFLICT", "인증에 실패했습니다. 다시 시도해 주세요.");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.expired },
      });
      throw new AppError("CONFLICT", "인증번호가 만료되었습니다.");
    }
    if (row.attemptCount >= config.maxVerifyAttempts) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.locked },
      });
      throw new AppError(
        "CONFLICT",
        "인증 시도 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요.",
      );
    }

    const expected = hashMatchonOtpCode({
      code,
      purpose: PhoneVerificationPurpose.password_reset,
      phoneNormalized: phone.normalized,
      pepper: config.pepper,
    });
    if (!safeEqualHex(expected, row.codeHash)) {
      const next = row.attemptCount + 1;
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: {
          attemptCount: next,
          status:
            next >= config.maxVerifyAttempts
              ? PhoneVerificationStatus.locked
              : PhoneVerificationStatus.pending,
        },
      });
      throw new AppError("VALIDATION_ERROR", "인증번호가 일치하지 않습니다.");
    }

    const token = generateMatchonVerificationToken();
    const tokenHash = hashMatchonVerificationToken(token, config.pepper);
    const tokenExpires = new Date(Date.now() + config.verificationTokenTtlMs);
    await prisma.phoneVerification.update({
      where: { id: row.id },
      data: {
        status: PhoneVerificationStatus.verified,
        verifiedAt: new Date(),
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: tokenExpires,
      },
    });
    return {
      passwordResetToken: token,
      expiresAt: tokenExpires.toISOString(),
    };
  },

  async resetPasswordWithToken(input: {
    passwordResetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ ok: true }> {
    const config = await loadSendConfig();
    if (!config.passwordResetPhoneEnabled) {
      throw new AppError(
        "FORBIDDEN",
        "휴대폰 비밀번호 재설정 기능은 준비 중입니다. 관리자에게 문의해 주세요.",
      );
    }
    assertProductionUserOtpAllowedWithDiagnostics(config);
    const token = String(input.passwordResetToken ?? "").trim();
    if (!token) {
      throw new AppError("VALIDATION_ERROR", "인증이 필요합니다.");
    }
    if (input.newPassword !== input.confirmPassword) {
      throw new AppError("VALIDATION_ERROR", "비밀번호 확인이 일치하지 않습니다.");
    }
    const parsed = passwordSchema.safeParse(input.newPassword);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "비밀번호 정책을 확인해 주세요.",
      );
    }

    const tokenHash = hashMatchonVerificationToken(token, config.pepper);
    const row = await prisma.phoneVerification.findFirst({
      where: {
        verificationTokenHash: tokenHash,
        purpose: PhoneVerificationPurpose.password_reset,
        status: PhoneVerificationStatus.verified,
      },
    });
    if (!row?.userId || !row.verificationTokenExpiresAt) {
      throw new AppError("CONFLICT", "인증이 유효하지 않습니다.");
    }
    if (row.verificationTokenExpiresAt.getTime() < Date.now()) {
      await prisma.phoneVerification.update({
        where: { id: row.id },
        data: { status: PhoneVerificationStatus.expired },
      });
      throw new AppError("CONFLICT", "인증이 만료되었습니다.");
    }

    const user = await prisma.user.findFirst({
      where: { id: row.userId },
      select: { id: true, authUserId: true, loginId: true },
    });
    if (!user?.authUserId) {
      throw new AppError("NOT_FOUND", "계정을 찾을 수 없습니다.");
    }

    const { completePasswordReset } = await import(
      "@/server/auth/complete-password-reset"
    );
    await completePasswordReset({
      userId: user.id,
      authUserId: user.authUserId,
      newPassword: parsed.data,
      resetMethod: "phone_verification",
      credentialId: row.id,
      auditAction: AuditAction.password_reset_by_phone_completed,
      auditAfterData: { verificationId: row.id },
      consumeCredential: async () => {
        const consumed = await prisma.phoneVerification.updateMany({
          where: {
            id: row.id,
            status: PhoneVerificationStatus.verified,
          },
          data: {
            status: PhoneVerificationStatus.consumed,
            consumedAt: new Date(),
            verificationTokenHash: null,
            verificationTokenExpiresAt: null,
          },
        });
        if (consumed.count !== 1) {
          throw new AppError("CONFLICT", "이미 사용된 인증입니다.");
        }
      },
    });

    return { ok: true as const };
  },

  /** Dev/E2E only — Production에서는 null */
  peekE2eCode(requestId: string): string | null {
    const config = loadMatchonPhoneVerificationConfig();
    if (!isMatchonAuthSmsE2eInboxAllowed(config)) return null;
    return getMatchonAuthSmsE2eCode(config, requestId)?.code ?? null;
  },
};
