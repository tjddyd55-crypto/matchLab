/**
 * 선생님 로그인 계정 — 링크 기반 self setup / 비밀번호 재설정.
 *
 * 정책 (선수 계정 설정과 동일한 계약):
 * - 관장은 링크만 발급한다. 비밀번호는 서버·DB·로그 어디에도 남기지 않는다.
 * - DB에는 tokenHash만 저장하고 raw token은 URL에만 존재한다.
 * - 링크는 1회용이며 새로 발급하면 기존 활성 링크를 폐기한다.
 * - 본인이 직접 설정하므로 `mustChangePassword`는 false.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AuditAction, UserRole } from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import {
  GYM_STAFF_ACCOUNT_SETUP_TTL_MS,
  GYM_STAFF_PASSWORD_RESET_TTL_MS,
  buildGymStaffAccountSetupMessage,
  buildGymStaffAccountSetupUrl,
  buildGymStaffPasswordResetMessage,
  buildGymStaffPasswordResetUrl,
  generateGymStaffAccountToken,
  hashGymStaffAccountToken,
  type GymStaffAccountStatusKind,
} from "@/lib/gym-staff-account/token";
import { requireGymPortalOwnerManage } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymStaffRepository } from "@/lib/repositories/gym-staff.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";

export type GymStaffSetupPageStatus =
  | "valid"
  | "expired"
  | "used"
  | "revoked"
  | "invalid";

export type GymStaffAccountPanelState = {
  statusKind: GymStaffAccountStatusKind;
  loginId: string | null;
  hasAccount: boolean;
  activeSetupExpiresAt: string | null;
  activeResetExpiresAt: string | null;
};

type TokenLifecycle = {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
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

/**
 * gym_staff 로그인 계정 생성.
 * Auth User 생성 후 DB User 생성이 실패하면 Auth User를 되돌린다.
 */
async function createGymStaffLoginAccount(input: {
  loginId: string;
  password: string;
  name: string;
}): Promise<{ userId: string; loginId: string }> {
  const authEmail = loginIdToAuthEmail(input.loginId);
  const supabase = await ensureSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user?.id) {
    throw new AppError(
      "CONFLICT",
      "로그인 계정 생성에 실패했습니다. 아이디가 이미 사용 중일 수 있습니다.",
      error?.message,
    );
  }

  const authUserId = data.user.id;
  try {
    const user = await prisma.user.create({
      data: {
        authUserId,
        email: authEmail,
        loginId: input.loginId,
        name: input.name,
        role: UserRole.gym_staff,
        mustChangePassword: false,
        passwordIssuedAt: new Date(),
      },
      select: { id: true },
    });
    return { userId: user.id, loginId: input.loginId };
  } catch (e) {
    await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw e;
  }
}

async function assertGymCanManageStaffAccount(
  actor: ActorContext,
  staffId: string,
) {
  const access = await requireGymPortalOwnerManage(actor);
  const staff = await gymStaffRepository.findByIdForGym(staffId, access.gymId);
  if (!staff) {
    throw new AppError("NOT_FOUND", "선생님을 찾을 수 없습니다.");
  }
  return { access, staff };
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
      parsed.error.issues[0]?.message ?? "비밀번호는 8자 이상이어야 합니다.",
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

function classifyToken(row: TokenLifecycle): GymStaffSetupPageStatus {
  if (row.revokedAt) return "revoked";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "valid";
}

function assertUsableToken(
  status: GymStaffSetupPageStatus,
  kind: "setup" | "reset",
): void {
  if (status === "valid") return;
  if (status === "expired") {
    throw new AppError(
      "FORBIDDEN",
      kind === "setup"
        ? "계정 설정 링크가 만료되었습니다. 체육관에 새 링크를 요청해 주세요."
        : "비밀번호 재설정 링크가 만료되었습니다. 체육관에 새 링크를 요청해 주세요.",
    );
  }
  if (status === "used") {
    throw new AppError(
      "FORBIDDEN",
      kind === "setup"
        ? "이미 사용된 계정 설정 링크입니다. 로그인 화면에서 로그인해 주세요."
        : "이미 사용된 재설정 링크입니다. 로그인해 주세요.",
    );
  }
  throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
}

type TxClient = Parameters<typeof auditRepository.createAuditLog>[1];

async function revokeActiveSetupTokens(
  gymStaffId: string,
  excludeId?: string,
  tx?: TxClient,
) {
  const client = tx ?? prisma;
  await client.gymStaffAccountSetupToken.updateMany({
    where: {
      gymStaffId,
      usedAt: null,
      revokedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

async function revokeActiveResetTokens(
  gymStaffId: string,
  excludeId?: string,
  tx?: TxClient,
) {
  const client = tx ?? prisma;
  await client.gymStaffPasswordResetToken.updateMany({
    where: {
      gymStaffId,
      usedAt: null,
      revokedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export const gymStaffAccountSetupService = {
  async getPanelState(
    actor: ActorContext,
    staffId: string,
  ): Promise<GymStaffAccountPanelState> {
    const { staff } = await assertGymCanManageStaffAccount(actor, staffId);

    const [activeSetup, activeReset] = await Promise.all([
      prisma.gymStaffAccountSetupToken.findFirst({
        where: { gymStaffId: staffId, usedAt: null, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { expiresAt: true },
      }),
      prisma.gymStaffPasswordResetToken.findFirst({
        where: { gymStaffId: staffId, usedAt: null, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { expiresAt: true },
      }),
    ]);

    const loginId = staff.user?.loginId ?? null;
    const hasAccount = Boolean(staff.userId && loginId);

    let statusKind: GymStaffAccountStatusKind;
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

  async createSetupLink(actor: ActorContext, staffId: string) {
    const { access, staff } = await assertGymCanManageStaffAccount(
      actor,
      staffId,
    );

    const rawToken = generateGymStaffAccountToken();
    const tokenHash = hashGymStaffAccountToken(rawToken);
    const expiresAt = new Date(Date.now() + GYM_STAFF_ACCOUNT_SETUP_TTL_MS);
    const url = buildGymStaffAccountSetupUrl(rawToken);
    const message = buildGymStaffAccountSetupMessage({
      staffName: staff.name,
      gymName: access.gym.name,
      setupUrl: url,
      hoursValid: Math.round(
        GYM_STAFF_ACCOUNT_SETUP_TTL_MS / (60 * 60 * 1000),
      ),
    });

    await prisma.$transaction(async (tx) => {
      await revokeActiveSetupTokens(staffId, undefined, tx);
      await tx.gymStaffAccountSetupToken.create({
        data: {
          gymStaffId: staffId,
          userId: staff.userId,
          tokenHash,
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_account_setup_link_created,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: {
            expiresAt: expiresAt.toISOString(),
            hasLinkedUser: Boolean(staff.userId),
          },
        },
        tx,
      );
    });

    return { url, expiresAt, message };
  },

  async revokeSetupLink(actor: ActorContext, staffId: string) {
    await assertGymCanManageStaffAccount(actor, staffId);

    await prisma.$transaction(async (tx) => {
      const result = await tx.gymStaffAccountSetupToken.updateMany({
        where: { gymStaffId: staffId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count === 0) {
        throw new AppError("NOT_FOUND", "폐기할 활성 설정 링크가 없습니다.");
      }
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_account_setup_link_revoked,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: { revokedCount: result.count },
        },
        tx,
      );
    });

    return { ok: true as const };
  },

  async getSetupPageByToken(rawToken: string): Promise<{
    staffName: string;
    gymName: string;
    status: GymStaffSetupPageStatus;
    existingLoginId: string | null;
  }> {
    const tokenHash = hashGymStaffAccountToken(rawToken.trim());
    const row = await prisma.gymStaffAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        gymStaff: {
          select: {
            name: true,
            gym: { select: { name: true } },
            user: { select: { loginId: true } },
          },
        },
      },
    });

    if (!row) {
      return {
        staffName: "",
        gymName: "",
        status: "invalid",
        existingLoginId: null,
      };
    }

    const status = classifyToken(row);
    const valid = status === "valid";
    return {
      staffName: valid ? row.gymStaff.name : "",
      gymName: valid ? row.gymStaff.gym.name : "",
      status,
      existingLoginId: valid ? (row.gymStaff.user?.loginId ?? null) : null,
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
    const taken =
      (await userRepository.isLoginIdTaken(loginId, excludeUserId)) ||
      (await userRepository.isAuthEmailTaken(
        loginIdToAuthEmail(loginId),
        excludeUserId,
      ));

    if (taken) {
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
    const tokenHash = hashGymStaffAccountToken(rawToken.trim());
    const row = await prisma.gymStaffAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        gymStaff: { select: { userId: true } },
      },
    });
    if (!row || classifyToken(row) !== "valid") return null;
    return row.gymStaff.userId;
  },

  async completeSetup(
    rawToken: string,
    input: { loginId: string; password: string; passwordConfirm: string },
  ): Promise<{ loginId: string }> {
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }

    const tokenHash = hashGymStaffAccountToken(rawToken.trim());
    const tokenRow = await prisma.gymStaffAccountSetupToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        gymStaffId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        gymStaff: {
          select: {
            id: true,
            name: true,
            userId: true,
            user: { select: { id: true, loginId: true, authUserId: true } },
          },
        },
      },
    });

    if (!tokenRow) {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }
    assertUsableToken(classifyToken(tokenRow), "setup");

    const loginId = parseLoginId(input.loginId);
    const password = parsePassword(input.password, loginId);
    const staff = tokenRow.gymStaff;
    const existingUser = staff.user;

    if (existingUser?.authUserId) {
      const loginIdChanged = existingUser.loginId !== loginId;
      if (loginIdChanged) {
        const avail = await gymStaffAccountSetupService.isLoginIdAvailable(
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
        const now = new Date();
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            loginId,
            email: loginIdToAuthEmail(loginId),
            mustChangePassword: false,
            passwordIssuedAt: now,
            passwordResetAt: now,
          },
        });
        if (!staff.userId) {
          await gymStaffRepository.linkUserId(tx, staff.id, existingUser.id);
        }
        await tx.gymStaffAccountSetupToken.update({
          where: { id: tokenRow.id },
          data: { usedAt: now },
        });
        await revokeActiveSetupTokens(staff.id, tokenRow.id, tx);
        await auditRepository.createAuditLog(
          {
            actorUserId: existingUser.id,
            action: AuditAction.gym_staff_account_setup_completed,
            targetType: "GymStaff",
            targetId: staff.id,
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

    const avail = await gymStaffAccountSetupService.isLoginIdAvailable(loginId);
    if (!avail.available) {
      throw new AppError(
        "CONFLICT",
        avail.message ?? "이미 사용 중인 아이디입니다.",
      );
    }

    const account = await createGymStaffLoginAccount({
      loginId,
      password,
      name: staff.name,
    });

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await gymStaffRepository.linkUserId(tx, staff.id, account.userId);
      await tx.gymStaffAccountSetupToken.update({
        where: { id: tokenRow.id },
        data: { usedAt: now, userId: account.userId },
      });
      await revokeActiveSetupTokens(staff.id, tokenRow.id, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: account.userId,
          action: AuditAction.gym_staff_account_setup_completed,
          targetType: "GymStaff",
          targetId: staff.id,
          afterData: { userId: account.userId, mode: "new_user" },
        },
        tx,
      );
    });

    return { loginId: account.loginId };
  },

  async createPasswordResetLink(actor: ActorContext, staffId: string) {
    const { staff } = await assertGymCanManageStaffAccount(actor, staffId);

    if (!staff.userId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "아직 계정이 없습니다. 계정 설정 링크를 먼저 발급해 주세요.",
      );
    }

    const user = await userRepository.findUserById(staff.userId);
    if (!user?.authUserId || !user.loginId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "아직 계정이 없습니다. 계정 설정 링크를 먼저 발급해 주세요.",
      );
    }

    const rawToken = generateGymStaffAccountToken();
    const tokenHash = hashGymStaffAccountToken(rawToken);
    const expiresAt = new Date(Date.now() + GYM_STAFF_PASSWORD_RESET_TTL_MS);
    const url = buildGymStaffPasswordResetUrl(rawToken);
    const message = buildGymStaffPasswordResetMessage({
      staffName: staff.name,
      resetUrl: url,
      hoursValid: Math.round(
        GYM_STAFF_PASSWORD_RESET_TTL_MS / (60 * 60 * 1000),
      ),
    });

    await prisma.$transaction(async (tx) => {
      await revokeActiveResetTokens(staffId, undefined, tx);
      await tx.gymStaffPasswordResetToken.create({
        data: {
          userId: user.id,
          gymStaffId: staffId,
          tokenHash,
          requestSource: "gym_admin_link",
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_password_reset_link_created,
          targetType: "GymStaff",
          targetId: staffId,
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
    staffName: string;
    loginIdMasked: string;
    status: GymStaffSetupPageStatus;
  }> {
    const tokenHash = hashGymStaffAccountToken(rawToken.trim());
    const row = await prisma.gymStaffPasswordResetToken.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        gymStaff: { select: { name: true } },
        user: { select: { loginId: true } },
      },
    });

    if (!row) {
      return { staffName: "", loginIdMasked: "", status: "invalid" };
    }

    const status = classifyToken(row);
    const loginId = row.user.loginId ?? "";
    const loginIdMasked =
      status !== "valid"
        ? ""
        : loginId.length > 2
          ? `${loginId.slice(0, 2)}${"*".repeat(Math.min(6, loginId.length - 2))}`
          : "***";

    return {
      staffName: status === "valid" ? row.gymStaff.name : "",
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

    const tokenHash = hashGymStaffAccountToken(rawToken.trim());
    const tokenRow = await prisma.gymStaffPasswordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        gymStaffId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        user: { select: { id: true, loginId: true, authUserId: true } },
      },
    });

    if (!tokenRow) {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }
    assertUsableToken(classifyToken(tokenRow), "reset");

    const user = tokenRow.user;
    if (!user.authUserId || !user.loginId) {
      throw new AppError("NOT_FOUND", "선생님 로그인 계정을 찾을 수 없습니다.");
    }

    const password = parsePassword(input.password, user.loginId);
    await updateSupabaseCredentials(user.authUserId, { password });

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.user.update({
        where: { id: user.id },
        data: { mustChangePassword: false, passwordResetAt: now },
      });
      await tx.gymStaffPasswordResetToken.update({
        where: { id: tokenRow.id },
        data: { usedAt: now },
      });
      await revokeActiveResetTokens(tokenRow.gymStaffId, tokenRow.id, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: user.id,
          action: AuditAction.gym_staff_password_reset_completed,
          targetType: "GymStaff",
          targetId: tokenRow.gymStaffId,
          afterData: { userId: user.id, requestSource: "token_link" },
        },
        tx,
      );
    });

    return { loginId: user.loginId };
  },
};
