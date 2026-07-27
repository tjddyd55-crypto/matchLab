import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  FIGHTER_ACCOUNT_SETUP_TTL_MS,
  FIGHTER_PASSWORD_RESET_TTL_MS,
  buildFighterAccountSetupMessage,
  buildFighterAccountSetupUrl,
  buildFighterPasswordResetMessage,
  buildFighterPasswordResetUrl,
  generateFighterAccountToken,
  hashFighterAccountToken,
  type FighterAccountStatusKind,
} from "@/lib/fighter-account/token";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import { AuditAction } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { fighterAccountRepository } from "@/lib/repositories/fighter-account.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";

export type SetupPageStatus = "valid" | "expired" | "used" | "revoked" | "invalid";

export type GymFighterAccountPanelState = {
  statusKind: FighterAccountStatusKind;
  loginId: string | null;
  hasAccount: boolean;
  activeSetupExpiresAt: string | null;
  activeResetExpiresAt: string | null;
};

async function ensureSupabaseAdmin() {
  try {
    return createSupabaseAdminClient();
  } catch (e) {
    throw new AppError(
      "INTERNAL",
      "계정 처리를 위해 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.",
      e instanceof Error ? e.message : undefined,
    );
  }
}

async function updateSupabaseCredentials(
  authUserId: string,
  input: { password?: string; email?: string },
) {
  const supabase = await ensureSupabaseAdmin();
  const payload: { password?: string; email?: string } = {};
  if (input.password) payload.password = input.password;
  if (input.email) payload.email = input.email;
  const { error } = await supabase.auth.admin.updateUserById(
    authUserId,
    payload,
  );
  if (error) {
    throw new AppError(
      "INTERNAL",
      "계정 정보 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      error.message,
    );
  }
}

async function assertGymCanManageFighterAccount(
  actor: ActorContext,
  fighterId: string,
) {
  requireRole(actor, ["gym", "admin"]);
  const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
  if (!ctx) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");

  const gymId = actor.gymId ?? ctx.currentGymId;
  if (!gymId) {
    throw new AppError("FORBIDDEN", "체육관 계정 설정이 필요합니다.");
  }
  await requireGymOwner(actor, gymId);

  const affiliated = await fighterRepository.findActiveGymHistory(
    fighterId,
    gymId,
  );
  if (!affiliated) {
    throw new AppError(
      "FORBIDDEN",
      "이 선수는 현재 체육관 소속이 아닙니다.",
    );
  }

  return { ctx, gymId };
}

function parseLoginId(raw: string): string {
  const parsed = loginIdSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ??
        "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
    );
  }
  return parsed.data;
}

function parsePassword(raw: string, loginId: string): string {
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ??
        "비밀번호는 8자 이상이어야 합니다.",
    );
  }
  if (parsed.data.toLowerCase() === loginId.toLowerCase()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "비밀번호는 아이디와 같을 수 없습니다.",
    );
  }
  return parsed.data;
}

async function revokeActiveSetupTokens(
  fighterId: string,
  excludeId?: string,
  tx?: Parameters<typeof auditRepository.createAuditLog>[1],
) {
  const client = tx ?? prisma;
  await client.fighterAccountSetupToken.updateMany({
    where: {
      fighterId,
      usedAt: null,
      revokedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

async function revokeActiveResetTokens(
  fighterId: string,
  excludeId?: string,
  tx?: Parameters<typeof auditRepository.createAuditLog>[1],
) {
  const client = tx ?? prisma;
  await client.fighterPasswordResetToken.updateMany({
    where: {
      fighterId,
      usedAt: null,
      revokedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

function classifySetupToken(row: {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}): SetupPageStatus {
  if (row.revokedAt) return "revoked";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "valid";
}

export const fighterAccountSetupService = {
  async getGymPanelState(
    actor: ActorContext,
    fighterId: string,
  ): Promise<GymFighterAccountPanelState> {
    await assertGymCanManageFighterAccount(actor, fighterId);

    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: {
        userId: true,
        user: { select: { loginId: true } },
        accountSetupTokens: {
          where: { usedAt: null, revokedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { expiresAt: true },
        },
        passwordResetTokens: {
          where: { usedAt: null, revokedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { expiresAt: true },
        },
      },
    });
    if (!fighter) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");

    const loginId = fighter.user?.loginId ?? null;
    const hasAccount = Boolean(fighter.userId && loginId);
    const activeSetup = fighter.accountSetupTokens[0] ?? null;
    const activeReset = fighter.passwordResetTokens[0] ?? null;

    let statusKind: FighterAccountStatusKind;
    if (hasAccount) {
      statusKind = "active";
    } else if (activeSetup) {
      statusKind =
        activeSetup.expiresAt.getTime() > Date.now()
          ? "setup_link_active"
          : "setup_link_expired";
    } else {
      statusKind = "no_account";
    }

    return {
      statusKind,
      loginId,
      hasAccount,
      activeSetupExpiresAt:
        activeSetup && activeSetup.expiresAt.getTime() > Date.now()
          ? activeSetup.expiresAt.toISOString()
          : null,
      activeResetExpiresAt:
        activeReset && activeReset.expiresAt.getTime() > Date.now()
          ? activeReset.expiresAt.toISOString()
          : null,
    };
  },

  async createSetupLink(actor: ActorContext, fighterId: string) {
    await assertGymCanManageFighterAccount(actor, fighterId);

    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        name: true,
        userId: true,
        currentGym: { select: { name: true } },
      },
    });
    if (!fighter) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");

    const rawToken = generateFighterAccountToken();
    const tokenHash = hashFighterAccountToken(rawToken);
    const expiresAt = new Date(Date.now() + FIGHTER_ACCOUNT_SETUP_TTL_MS);
    const url = buildFighterAccountSetupUrl(rawToken);
    const message = buildFighterAccountSetupMessage({
      fighterName: fighter.name,
      setupUrl: url,
      hoursValid: Math.round(FIGHTER_ACCOUNT_SETUP_TTL_MS / (60 * 60 * 1000)),
    });

    await prisma.$transaction(async (tx) => {
      await revokeActiveSetupTokens(fighterId, undefined, tx);
      await tx.fighterAccountSetupToken.create({
        data: {
          fighterId,
          userId: fighter.userId,
          tokenHash,
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.fighter_account_setup_link_created,
          targetType: "Fighter",
          targetId: fighterId,
          afterData: {
            expiresAt: expiresAt.toISOString(),
            hasLinkedUser: Boolean(fighter.userId),
          },
        },
        tx,
      );
    });

    return { url, expiresAt, message };
  },

  async revokeSetupLink(actor: ActorContext, fighterId: string) {
    await assertGymCanManageFighterAccount(actor, fighterId);

    await prisma.$transaction(async (tx) => {
      const result = await tx.fighterAccountSetupToken.updateMany({
        where: {
          fighterId,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      if (result.count === 0) {
        throw new AppError("NOT_FOUND", "폐기할 활성 설정 링크가 없습니다.");
      }
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.fighter_account_setup_link_revoked,
          targetType: "Fighter",
          targetId: fighterId,
          afterData: { revokedCount: result.count },
        },
        tx,
      );
    });

    return { ok: true as const };
  },

  async getSetupPageByToken(rawToken: string): Promise<{
    fighterName: string;
    gymName: string;
    status: SetupPageStatus;
    existingLoginId: string | null;
  }> {
    const tokenHash = hashFighterAccountToken(rawToken.trim());
    const row = await prisma.fighterAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        fighter: {
          select: {
            name: true,
            currentGym: { select: { name: true } },
            user: { select: { loginId: true } },
          },
        },
      },
    });

    if (!row) {
      return {
        fighterName: "",
        gymName: "",
        status: "invalid",
        existingLoginId: null,
      };
    }

    const status = classifySetupToken(row);
    return {
      fighterName: status === "valid" ? row.fighter.name : "",
      gymName:
        status === "valid" ? (row.fighter.currentGym?.name ?? "") : "",
      status,
      existingLoginId:
        status === "valid" ? (row.fighter.user?.loginId ?? null) : null,
    };
  },

  async isLoginIdAvailable(
    loginIdRaw: string,
    excludeUserId?: string | null,
  ): Promise<{ available: boolean; loginId: string; message?: string }> {
    const parsed = loginIdSchema.safeParse(loginIdRaw);
    if (!parsed.success) {
      return {
        available: false,
        loginId: loginIdRaw.trim().toLowerCase(),
        message:
          parsed.error.issues[0]?.message ??
          "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
      };
    }
    const loginId = parsed.data;
    if (await fighterAccountRepository.isLoginIdTaken(loginId, excludeUserId ?? undefined)) {
      return {
        available: false,
        loginId,
        message: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
      };
    }
    const authEmail = loginIdToAuthEmail(loginId);
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: { equals: authEmail, mode: "insensitive" },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (emailTaken) {
      return {
        available: false,
        loginId,
        message: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
      };
    }
    return { available: true, loginId };
  },

  async resolveExcludeUserIdForSetupToken(
    rawToken: string,
  ): Promise<string | null> {
    const tokenHash = hashFighterAccountToken(rawToken.trim());
    const row = await prisma.fighterAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        fighter: { select: { userId: true } },
      },
    });
    if (!row || classifySetupToken(row) !== "valid") return null;
    return row.fighter.userId;
  },

  async completeSetup(
    rawToken: string,
    input: { loginId: string; password: string; passwordConfirm: string },
  ): Promise<{ loginId: string }> {
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }

    const tokenHash = hashFighterAccountToken(rawToken.trim());
    const tokenRow = await prisma.fighterAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        fighterId: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        fighter: {
          select: {
            id: true,
            name: true,
            userId: true,
            user: {
              select: {
                id: true,
                loginId: true,
                authUserId: true,
              },
            },
          },
        },
      },
    });

    if (!tokenRow) {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }
    const status = classifySetupToken(tokenRow);
    if (status === "expired") {
      throw new AppError(
        "FORBIDDEN",
        "계정 설정 링크가 만료되었습니다. 소속 체육관에 새 링크를 요청해 주세요.",
      );
    }
    if (status === "used") {
      throw new AppError(
        "FORBIDDEN",
        "이미 사용된 계정 설정 링크입니다. 로그인 화면에서 로그인해 주세요.",
      );
    }
    if (status !== "valid") {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }

    const loginId = parseLoginId(input.loginId);
    const password = parsePassword(input.password, loginId);
    const fighter = tokenRow.fighter;
    const existingUser = fighter.user;

    if (existingUser?.authUserId) {
      const loginIdChanged = existingUser.loginId !== loginId;
      if (loginIdChanged) {
        const avail = await fighterAccountSetupService.isLoginIdAvailable(
          loginId,
          existingUser.id,
        );
        if (!avail.available) {
          throw new AppError(
            "CONFLICT",
            avail.message ?? "이미 사용 중인 아이디입니다.",
          );
        }
      }

      await updateSupabaseCredentials(existingUser.authUserId, {
        password,
        email: loginIdChanged ? loginIdToAuthEmail(loginId) : undefined,
      });

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            loginId,
            email: loginIdToAuthEmail(loginId),
            mustChangePassword: false,
            passwordIssuedAt: new Date(),
            passwordResetAt: new Date(),
          },
        });
        if (!fighter.userId) {
          await fighterAccountRepository.linkFighterUserId(
            tx,
            fighter.id,
            existingUser.id,
          );
        }
        await tx.fighterAccountSetupToken.update({
          where: { id: tokenRow.id },
          data: { usedAt: new Date() },
        });
        await revokeActiveSetupTokens(fighter.id, tokenRow.id, tx);
        await auditRepository.createAuditLog(
          {
            actorUserId: existingUser.id,
            action: AuditAction.fighter_account_setup_completed,
            targetType: "Fighter",
            targetId: fighter.id,
            afterData: {
              userId: existingUser.id,
              loginIdChanged,
              mode: "existing_user",
            },
          },
          tx,
        );
      });

      return { loginId };
    }

    const avail = await fighterAccountSetupService.isLoginIdAvailable(loginId);
    if (!avail.available) {
      throw new AppError(
        "CONFLICT",
        avail.message ?? "이미 사용 중인 아이디입니다.",
      );
    }

    const account = await fighterAccountService.createFighterLoginAccount({
      loginId,
      password,
      name: fighter.name,
      mustChangePassword: false,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await fighterAccountRepository.linkFighterUserId(
          tx,
          fighter.id,
          account.userId,
        );
        await tx.fighterAccountSetupToken.update({
          where: { id: tokenRow.id },
          data: { usedAt: new Date(), userId: account.userId },
        });
        await revokeActiveSetupTokens(fighter.id, tokenRow.id, tx);
        await auditRepository.createAuditLog(
          {
            actorUserId: account.userId,
            action: AuditAction.fighter_account_setup_completed,
            targetType: "Fighter",
            targetId: fighter.id,
            afterData: {
              userId: account.userId,
              mode: "new_user",
            },
          },
          tx,
        );
      });
    } catch (e) {
      // Auth User는 이미 생성됨 — 연결 실패 시 호출자가 재시도할 수 있도록 오류 전파
      throw e;
    }

    return { loginId: account.loginId };
  },

  async createPasswordResetLink(actor: ActorContext, fighterId: string) {
    const { ctx } = await assertGymCanManageFighterAccount(actor, fighterId);

    if (!ctx.userId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "아직 계정이 없습니다. 계정 설정 링크를 먼저 발급해 주세요.",
      );
    }

    const user = await userRepository.findUserById(ctx.userId);
    if (!user?.authUserId || !user.loginId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "아직 계정이 없습니다. 계정 설정 링크를 먼저 발급해 주세요.",
      );
    }

    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: { name: true },
    });
    if (!fighter) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");

    const rawToken = generateFighterAccountToken();
    const tokenHash = hashFighterAccountToken(rawToken);
    const expiresAt = new Date(Date.now() + FIGHTER_PASSWORD_RESET_TTL_MS);
    const url = buildFighterPasswordResetUrl(rawToken);
    const message = buildFighterPasswordResetMessage({
      fighterName: fighter.name,
      resetUrl: url,
      hoursValid: Math.round(FIGHTER_PASSWORD_RESET_TTL_MS / (60 * 60 * 1000)),
    });

    await prisma.$transaction(async (tx) => {
      await revokeActiveResetTokens(fighterId, undefined, tx);
      await tx.fighterPasswordResetToken.create({
        data: {
          userId: user.id,
          fighterId,
          tokenHash,
          requestSource: "gym_admin_link",
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.fighter_password_reset_link_created,
          targetType: "Fighter",
          targetId: fighterId,
          afterData: {
            expiresAt: expiresAt.toISOString(),
            requestSource: "gym_admin_link",
          },
        },
        tx,
      );
    });

    return { url, expiresAt, message, loginId: user.loginId };
  },

  async getResetPageByToken(rawToken: string): Promise<{
    fighterName: string;
    loginIdMasked: string;
    status: SetupPageStatus;
  }> {
    const tokenHash = hashFighterAccountToken(rawToken.trim());
    const row = await prisma.fighterPasswordResetToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        fighter: { select: { name: true } },
        user: { select: { loginId: true } },
      },
    });

    if (!row) {
      return { fighterName: "", loginIdMasked: "", status: "invalid" };
    }

    const status = classifySetupToken(row);
    const loginId = row.user.loginId ?? "";
    const loginIdMasked =
      status === "valid" && loginId.length > 2
        ? `${loginId.slice(0, 2)}${"*".repeat(Math.min(6, loginId.length - 2))}`
        : status === "valid"
          ? "***"
          : "";

    return {
      fighterName: status === "valid" ? row.fighter.name : "",
      loginIdMasked,
      status,
    };
  },

  async completePasswordReset(
    rawToken: string,
    input: { password: string; passwordConfirm: string },
  ): Promise<{ loginId: string }> {
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }

    const tokenHash = hashFighterAccountToken(rawToken.trim());
    const tokenRow = await prisma.fighterPasswordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        fighterId: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            loginId: true,
            authUserId: true,
          },
        },
      },
    });

    if (!tokenRow) {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }
    const status = classifySetupToken(tokenRow);
    if (status === "expired") {
      throw new AppError(
        "FORBIDDEN",
        "비밀번호 재설정 링크가 만료되었습니다. 소속 체육관에 새 링크를 요청해 주세요.",
      );
    }
    if (status === "used") {
      throw new AppError(
        "FORBIDDEN",
        "이미 사용된 재설정 링크입니다. 로그인해 주세요.",
      );
    }
    if (status !== "valid") {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }

    const user = tokenRow.user;
    if (!user.authUserId || !user.loginId) {
      throw new AppError("NOT_FOUND", "선수 로그인 계정을 찾을 수 없습니다.");
    }

    const password = parsePassword(input.password, user.loginId);
    await updateSupabaseCredentials(user.authUserId, { password });

    await prisma.$transaction(async (tx) => {
      await fighterAccountRepository.updatePasswordFlags(
        user.id,
        {
          mustChangePassword: false,
          passwordResetAt: new Date(),
        },
        tx,
      );
      await tx.fighterPasswordResetToken.update({
        where: { id: tokenRow.id },
        data: { usedAt: new Date() },
      });
      await revokeActiveResetTokens(tokenRow.fighterId, tokenRow.id, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: user.id,
          action: AuditAction.fighter_password_reset_completed,
          targetType: "Fighter",
          targetId: tokenRow.fighterId,
          afterData: {
            userId: user.id,
            requestSource: "token_link",
          },
        },
        tx,
      );
    });

    return { loginId: user.loginId };
  },
};
