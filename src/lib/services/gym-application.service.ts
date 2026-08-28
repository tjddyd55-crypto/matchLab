import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymApplicationAttachmentType,
  GymApplicationStatus,
  GymStatus,
  UserRole,
} from "@/lib/enums";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import { memberGymFilesBucket } from "@/lib/member-gym/constants";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePostalCode } from "@/lib/postal-address";
import { formatPostalAddress } from "@/lib/postal-address";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";
import {
  assertApplicationRequestedLoginIdAvailable,
  checkApplicationRequestedLoginIdAvailability,
  parseRequiredRequestedLoginId,
} from "@/lib/services/application-requested-login-id";
import { assertGymApplicationAttachmentMimeAndSize } from "./gym-application-upload.service";

export const GYM_OWNER_APPLICATION_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashGymApplicationOwnerInviteToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function buildGymApplicationOwnerInviteUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/gym-application-invite/${token.trim()}`;
}

export type GymApplicationAttachmentInput = {
  attachmentType: GymApplicationAttachmentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type GymApplicationInput = {
  gymName: string;
  representativeName: string;
  contactName: string;
  phone?: string;
  mobilePhone: string;
  email: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  businessNo?: string;
  sportType?: string;
  description?: string;
  privacyConsent: boolean;
  registrationConsent: boolean;
  smsConsent?: boolean;
  informationConsent?: boolean;
  signatureName: string;
  signatureConsent: boolean;
  requestedLoginId: string;
  /** 가입 시 비밀번호 — App DB에 저장하지 않고 Supabase Auth에만 생성 */
  password: string;
  passwordConfirm: string;
  uploadBatchId?: string;
  attachments?: GymApplicationAttachmentInput[];
};

function assertAttachmentPaths(attachments: GymApplicationAttachmentInput[]) {
  for (const a of attachments) {
    if (!a.storagePath.startsWith("gym-applications/")) {
      throw new AppError("FORBIDDEN", "첨부 파일 경로가 올바르지 않습니다.");
    }
    assertGymApplicationAttachmentMimeAndSize(a);
  }
  if (
    !attachments.some(
      (a) => a.attachmentType === GymApplicationAttachmentType.applicant_signature,
    )
  ) {
    throw new AppError("VALIDATION_ERROR", "손서명을 완료해 주세요.");
  }
}

function requireText(value: string | undefined, label: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw new AppError("VALIDATION_ERROR", `${label}을(를) 입력해 주세요.`);
  return v;
}

export const gymApplicationService = {
  async submit(input: GymApplicationInput & {
    signupVerificationToken?: string;
  }) {
    if (!input.privacyConsent || !input.registrationConsent) {
      throw new AppError("VALIDATION_ERROR", "필수 동의 항목에 동의해 주세요.");
    }
    if (!input.signatureConsent || !input.signatureName.trim()) {
      throw new AppError("VALIDATION_ERROR", "신청인 확인이 필요합니다.");
    }
    const attachments = input.attachments ?? [];
    assertAttachmentPaths(attachments);
    const bucket = memberGymFilesBucket();
    const postalCode = normalizePostalCode(input.postalCode);

    const { loadMatchonPhoneVerificationConfig } = await import(
      "@/server/phone-verification/config/matchon-phone-verification-config"
    );
    const phoneConfig = loadMatchonPhoneVerificationConfig();
    const mobilePhoneRaw = requireText(input.mobilePhone, "연락처");
    let mobilePhoneNormalized = mobilePhoneRaw;
    if (phoneConfig.signupPhoneVerificationEnabled) {
      const { matchonPhoneVerificationService } = await import(
        "@/server/phone-verification/services/matchon-phone-verification.service"
      );
      const verified = await matchonPhoneVerificationService.consumeSignupToken({
        token: String(input.signupVerificationToken ?? ""),
        phone: mobilePhoneRaw,
        accountType: "gym",
      });
      mobilePhoneNormalized = verified.phoneNormalized;
    } else {
      const { validateKrMobile } = await import("@/lib/phone");
      const phone = validateKrMobile(mobilePhoneRaw);
      if (!phone.ok) {
        throw new AppError("VALIDATION_ERROR", phone.message);
      }
      mobilePhoneNormalized = phone.normalized;
    }

    const requestedLoginId = parseRequiredRequestedLoginId(
      input.requestedLoginId,
    );
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }
    const passwordParsed = passwordSchema.safeParse(input.password);
    if (!passwordParsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        passwordParsed.error.issues[0]?.message ??
          "비밀번호는 8자 이상이어야 합니다.",
      );
    }
    const password = passwordParsed.data;
    const authEmail = loginIdToAuthEmail(requestedLoginId);

    await assertApplicationRequestedLoginIdAvailable(requestedLoginId);

    const supabase = createSupabaseAdminClient();
    const { data: createdAuth, error: authError } =
      await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          matchon_pending_gym_application: true,
          requested_login_id: requestedLoginId,
        },
      });
    if (authError || !createdAuth.user) {
      throw new AppError(
        "INTERNAL",
        "로그인 계정 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        authError?.message,
      );
    }
    const pendingAuthUserId = createdAuth.user.id;

    try {
      return await prisma.$transaction(async (tx) => {
        await assertApplicationRequestedLoginIdAvailable(requestedLoginId, {
          client: tx,
        });
        const created = await tx.gymApplication.create({
          data: {
            gymName: requireText(input.gymName, "체육관명"),
            representativeName: requireText(input.representativeName, "대표자명"),
            contactName: requireText(input.contactName, "담당자명"),
            phone: input.phone?.trim() || null,
            mobilePhone: mobilePhoneNormalized,
            email: requireText(input.email, "이메일"),
            postalCode,
            address: input.address?.trim() || null,
            addressDetail: input.addressDetail?.trim() || null,
            businessNo: input.businessNo?.trim() || null,
            sportType: input.sportType?.trim() || null,
            description: input.description?.trim() || null,
            requestedLoginId,
            pendingAuthUserId,
            privacyConsent: true,
            registrationConsent: true,
            smsConsent: Boolean(input.smsConsent),
            informationConsent: Boolean(input.informationConsent),
            signatureName: input.signatureName.trim(),
            signatureConsent: true,
            signatureSignedAt: new Date(),
            uploadBatchId: input.uploadBatchId?.trim() || null,
            status: GymApplicationStatus.pending,
            termsAcceptedAt: new Date(),
            privacyAcceptedAt: new Date(),
          },
          select: { id: true, gymName: true, status: true },
        });

        if (attachments.length > 0) {
          await tx.gymApplicationAttachment.createMany({
            data: attachments.map((a) => ({
              applicationId: created.id,
              attachmentType: a.attachmentType,
              storageBucket: bucket,
              storagePath: a.storagePath,
              originalFileName: a.originalFileName.slice(0, 200),
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            })),
          });
        }

        return created;
      });
    } catch (e) {
      await supabase.auth.admin.deleteUser(pendingAuthUserId).catch(() => undefined);
      throw e;
    }
  },

  async listForAdmin(actor: ActorContext) {
    requireRole(actor, [UserRole.admin]);
    return prisma.gymApplication.findMany({
      where: { deletedAt: null },
      orderBy: [{ submittedAt: "desc" }],
      select: {
        id: true,
        gymName: true,
        representativeName: true,
        contactName: true,
        email: true,
        mobilePhone: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        createdGymId: true,
        requestedLoginId: true,
        createdGym: {
          select: {
            ownerUser: { select: { id: true, loginId: true, authUserId: true } },
          },
        },
      },
    });
  },

  async getForAdmin(actor: ActorContext, id: string) {
    requireRole(actor, [UserRole.admin]);
    const row = await prisma.gymApplication.findFirst({
      where: { id, deletedAt: null },
      include: {
        attachments: { where: { deletedAt: null } },
        createdGym: {
          select: {
            ownerUser: { select: { id: true, loginId: true, authUserId: true } },
          },
        },
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    return row;
  },

  async reject(actor: ActorContext, id: string, reviewMemo?: string) {
    requireRole(actor, [UserRole.admin]);
    const row = await this.getForAdmin(actor, id);
    if (
      row.status === GymApplicationStatus.approved ||
      row.status === GymApplicationStatus.rejected
    ) {
      throw new AppError("CONFLICT", "이미 처리된 신청입니다.");
    }
    const pendingAuthUserId = row.pendingAuthUserId;
    const updated = await prisma.gymApplication.update({
      where: { id },
      data: {
        status: GymApplicationStatus.rejected,
        reviewedAt: new Date(),
        reviewedByUserId: actor.userId,
        reviewMemo: reviewMemo?.trim() || null,
        pendingAuthUserId: null,
      },
    });
    if (pendingAuthUserId) {
      const supabase = createSupabaseAdminClient();
      await supabase.auth.admin.deleteUser(pendingAuthUserId).catch(() => undefined);
    }
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.gym_application_reviewed,
        targetType: "GymApplication",
        targetId: id,
        afterData: { status: "rejected" },
      },
    });
    return updated;
  },

  /**
   * 승인 시 Gym + User 생성.
   * pendingAuthUserId가 있으면(신규 가입에서 비밀번호 확보) Auth를 바로 연결하고
   * 초대 링크 없이 즉시 로그인 가능.
   * 레거시 신청(비밀번호 미확보)만 placeholder + invite 발급.
   * AssociationMemberGym은 절대 생성하지 않는다.
   */
  async approve(
    actor: ActorContext,
    id: string,
    reviewMemo?: string,
  ): Promise<{
    applicationId: string;
    gymId: string;
    loginReady: boolean;
    /** 레거시 신청에만 반환. 신규 direct-login 흐름에서는 null */
    inviteToken: string | null;
    inviteUrl: string | null;
  }> {
    requireRole(actor, [UserRole.admin]);
    const row = await this.getForAdmin(actor, id);
    if (row.status === GymApplicationStatus.approved) {
      throw new AppError("CONFLICT", "이미 승인된 신청입니다.");
    }
    if (row.status === GymApplicationStatus.rejected) {
      throw new AppError("CONFLICT", "반려된 신청은 승인할 수 없습니다.");
    }

    const requestedLoginId = row.requestedLoginId
      ? parseRequiredRequestedLoginId(row.requestedLoginId)
      : null;
    const pendingAuthUserId = row.pendingAuthUserId?.trim() || null;
    const directLogin = Boolean(pendingAuthUserId && requestedLoginId);

    if (!directLogin) {
      return this.approveLegacyWithInvite(actor, row, reviewMemo);
    }

    const authEmail = loginIdToAuthEmail(requestedLoginId!);
    const supabase = createSupabaseAdminClient();

    const result = await prisma.$transaction(async (tx) => {
      await assertApplicationRequestedLoginIdAvailable(requestedLoginId!, {
        excludeGymApplicationId: row.id,
        client: tx,
      });

      const existingAuthLink = await tx.user.findFirst({
        where: { authUserId: pendingAuthUserId! },
        select: { id: true },
      });
      if (existingAuthLink) {
        throw new AppError(
          "CONFLICT",
          "이미 다른 계정에 연결된 인증 정보입니다. 관리자에게 문의해 주세요.",
        );
      }

      const user = await tx.user.create({
        data: {
          name: row.contactName,
          email: authEmail,
          phone: row.mobilePhone,
          role: UserRole.gym,
          loginId: requestedLoginId!,
          authUserId: pendingAuthUserId!,
          mustChangePassword: false,
          passwordIssuedAt: new Date(),
          billingRequiredAt: new Date(),
        },
      });

      const address =
        formatPostalAddress({
          postalCode: row.postalCode,
          address: row.address,
          addressDetail: row.addressDetail,
        }) || null;
      const gym = await tx.gym.create({
        data: {
          ownerUserId: user.id,
          name: row.gymName,
          phone: row.phone || row.mobilePhone,
          address,
          status: GymStatus.active,
        },
      });

      await tx.gymApplication.update({
        where: { id },
        data: {
          status: GymApplicationStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: reviewMemo?.trim() || null,
          createdGymId: gym.id,
          pendingAuthUserId: null,
          ownerInviteTokenHash: null,
          ownerInviteExpiresAt: null,
          ownerInviteCreatedAt: null,
          ownerInviteCreatedByUserId: null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: AuditAction.gym_application_reviewed,
          targetType: "GymApplication",
          targetId: id,
          afterData: {
            status: "approved",
            gymId: gym.id,
            userId: user.id,
            loginReady: true,
            associationMemberGymCreated: false,
          },
        },
      });

      return { gymId: gym.id, userId: user.id };
    });

    await supabase.auth.admin
      .updateUserById(pendingAuthUserId!, {
        user_metadata: {
          matchon_pending_gym_application: false,
          requested_login_id: requestedLoginId,
        },
      })
      .catch(() => undefined);

    return {
      applicationId: id,
      gymId: result.gymId,
      loginReady: true,
      inviteToken: null,
      inviteUrl: null,
    };
  },

  /** 비밀번호를 신청 시 받지 않은 레거시 신청 — placeholder + invite */
  async approveLegacyWithInvite(
    actor: ActorContext,
    row: {
      id: string;
      contactName: string;
      mobilePhone: string;
      phone: string | null;
      postalCode: string | null;
      address: string | null;
      addressDetail: string | null;
      gymName: string;
      requestedLoginId: string | null;
    },
    reviewMemo?: string,
  ): Promise<{
    applicationId: string;
    gymId: string;
    loginReady: boolean;
    inviteToken: string;
    inviteUrl: string;
  }> {
    const inviteToken = randomBytes(24).toString("hex");
    const tokenHash = hashGymApplicationOwnerInviteToken(inviteToken);
    const expiresAt = new Date(Date.now() + GYM_OWNER_APPLICATION_INVITE_TTL_MS);
    const suffix = randomBytes(6).toString("hex");
    const requestedLoginId = row.requestedLoginId
      ? parseRequiredRequestedLoginId(row.requestedLoginId)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      if (requestedLoginId) {
        await assertApplicationRequestedLoginIdAvailable(requestedLoginId, {
          excludeGymApplicationId: row.id,
          client: tx,
        });
      }

      const user = await tx.user.create({
        data: {
          name: row.contactName,
          email: `pending-gym-${suffix}@internal.invalid`,
          phone: row.mobilePhone,
          role: UserRole.gym,
          loginId: requestedLoginId ?? `pending-gym-${suffix}`,
          authUserId: null,
          billingRequiredAt: new Date(),
        },
      });

      const address =
        formatPostalAddress({
          postalCode: row.postalCode,
          address: row.address,
          addressDetail: row.addressDetail,
        }) || null;
      const gym = await tx.gym.create({
        data: {
          ownerUserId: user.id,
          name: row.gymName,
          phone: row.phone || row.mobilePhone,
          address,
          status: GymStatus.active,
        },
      });

      await tx.gymApplication.update({
        where: { id: row.id },
        data: {
          status: GymApplicationStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: reviewMemo?.trim() || null,
          createdGymId: gym.id,
          ownerInviteTokenHash: tokenHash,
          ownerInviteExpiresAt: expiresAt,
          ownerInviteCreatedAt: new Date(),
          ownerInviteCreatedByUserId: actor.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: AuditAction.gym_application_reviewed,
          targetType: "GymApplication",
          targetId: row.id,
          afterData: {
            status: "approved",
            gymId: gym.id,
            userId: user.id,
            loginReady: false,
            legacyInvite: true,
            associationMemberGymCreated: false,
          },
        },
      });

      return { gymId: gym.id };
    });

    return {
      applicationId: row.id,
      gymId: result.gymId,
      loginReady: false,
      inviteToken,
      inviteUrl: buildGymApplicationOwnerInviteUrl(inviteToken),
    };
  },

  async getInviteContextByToken(token: string) {
    const tokenHash = hashGymApplicationOwnerInviteToken(token);
    const row = await prisma.gymApplication.findFirst({
      where: {
        ownerInviteTokenHash: tokenHash,
        status: GymApplicationStatus.approved,
        deletedAt: null,
      },
      include: { createdGym: { include: { ownerUser: true } } },
    });
    if (!row?.createdGym?.ownerUser) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (
      row.ownerInviteExpiresAt &&
      row.ownerInviteExpiresAt.getTime() <= Date.now()
    ) {
      return { ok: false as const, reason: "expired" as const };
    }
    const user = row.createdGym.ownerUser;
    if (user.authUserId && user.loginId && !user.loginId.startsWith("pending-gym-")) {
      return { ok: false as const, reason: "already_active" as const };
    }
    return {
      ok: true as const,
      applicationId: row.id,
      gymName: row.gymName,
      contactName: row.contactName,
      email: row.email,
      requestedLoginId: row.requestedLoginId,
      expiresAt: row.ownerInviteExpiresAt!,
    };
  },

  async isLoginIdAvailableForInvite(loginIdRaw: string, options?: {
    excludeUserId?: string;
  }) {
    return checkApplicationRequestedLoginIdAvailability(loginIdRaw, {
      excludeUserId: options?.excludeUserId,
    });
  },

  async acceptOwnerInvite(
    token: string,
    input: { loginId: string; password: string; passwordConfirm: string },
  ) {
    const ctx = await this.getInviteContextByToken(token);
    if (!ctx.ok) {
      if (ctx.reason === "already_active") {
        throw new AppError(
          "FORBIDDEN",
          "이미 활성화된 계정입니다.\n로그인 화면에서 설정한 아이디와 비밀번호로 로그인해 주세요.",
        );
      }
      if (ctx.reason === "expired") {
        throw new AppError(
          "FORBIDDEN",
          "계정 생성 링크가 만료되었습니다.\n관리자에게 새 링크를 요청해 주세요.",
        );
      }
      throw new AppError("FORBIDDEN", "유효하지 않은 초대 링크입니다.");
    }

    const tokenHash = hashGymApplicationOwnerInviteToken(token);
    const app = await prisma.gymApplication.findFirst({
      where: { ownerInviteTokenHash: tokenHash },
      include: { createdGym: { include: { ownerUser: true } } },
    });
    const user = app?.createdGym?.ownerUser;
    if (!app || !user) {
      throw new AppError("FORBIDDEN", "유효하지 않은 초대 링크입니다.");
    }

    const reservedLoginId =
      app.requestedLoginId ??
      (user.loginId && !user.loginId.startsWith("pending-gym-")
        ? user.loginId
        : null);
    const loginParsed = loginIdSchema.safeParse(
      reservedLoginId ?? input.loginId,
    );
    if (!loginParsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        loginParsed.error.issues[0]?.message ??
          "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
      );
    }
    const loginId = loginParsed.data;
    if (reservedLoginId && loginId !== reservedLoginId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "신청 시 선택한 로그인 아이디만 사용할 수 있습니다.",
      );
    }
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }
    const passwordParsed = passwordSchema.safeParse(input.password);
    if (!passwordParsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        passwordParsed.error.issues[0]?.message ??
          "비밀번호는 8자 이상이어야 합니다.",
      );
    }
    const password = passwordParsed.data;

    if (
      user.authUserId &&
      user.loginId &&
      !user.loginId.startsWith("pending-gym-")
    ) {
      await prisma.gymApplication.update({
        where: { id: app.id },
        data: {
          ownerInviteTokenHash: null,
          ownerInviteExpiresAt: null,
        },
      });
      return { loginId: user.loginId, alreadyActive: true as const };
    }

    await assertApplicationRequestedLoginIdAvailable(loginId, {
      excludeGymApplicationId: app.id,
      excludeUserId: user.id,
    });
    const authEmail = loginIdToAuthEmail(loginId);
    if (
      await prisma.user.findFirst({
        where: { email: { equals: authEmail, mode: "insensitive" } },
      })
    ) {
      throw new AppError(
        "CONFLICT",
        "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new AppError(
        "INTERNAL",
        "인증 계정 생성에 실패했습니다.",
        error?.message,
      );
    }
    const authUserId = created.user.id;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            loginId,
            email: authEmail,
            authUserId,
            mustChangePassword: false,
            passwordIssuedAt: new Date(),
            role: UserRole.gym,
          },
        });
        await tx.gymApplication.update({
          where: { id: app.id },
          data: {
            ownerInviteTokenHash: null,
            ownerInviteExpiresAt: null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: AuditAction.gym_application_reviewed,
            targetType: "GymApplication",
            targetId: app.id,
            afterData: { op: "owner_activated", loginId },
          },
        });
      });
    } catch (e) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw e;
    }

    return { loginId, alreadyActive: false as const };
  },
};
