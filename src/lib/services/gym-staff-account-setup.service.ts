/**
 * 선생님 로그인 계정 — 관장이 아이디·임시 비밀번호를 직접 발급.
 *
 * 정책:
 * - 비밀번호는 Supabase Auth에만 저장 (DB passwordHash 없음). 평문은 로그·응답 금지.
 * - GymStaff.userId 가 SSOT 연결. 신규 계정 mustChangePassword=true.
 * - 설정 링크 신규 발급은 차단. 기존 미사용 token은 계정 생성·재설정 시 폐기.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AuditAction, UserRole } from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import {
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
  mustChangePassword: boolean;
  passwordIssuedAt: string | null;
  accountCreatedAt: string | null;
  staffName: string;
  staffActive: boolean;
  /** @deprecated 링크 UI 제거 — 항상 null */
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
  mustChangePassword: boolean;
}): Promise<{ userId: string; loginId: string; createdAt: Date }> {
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
      "이미 사용 중인 로그인 아이디입니다.",
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
        mustChangePassword: input.mustChangePassword,
        passwordIssuedAt: new Date(),
      },
      select: { id: true, createdAt: true },
    });
    return {
      userId: user.id,
      loginId: input.loginId,
      createdAt: user.createdAt,
    };
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

    const loginId = staff.user?.loginId ?? null;
    const hasAccount = Boolean(staff.userId && loginId);
    const mustChangePassword = Boolean(staff.user?.mustChangePassword);

    let statusKind: GymStaffAccountStatusKind;
    if (!hasAccount) {
      statusKind = "no_account";
    } else if (mustChangePassword) {
      statusKind = "password_change_required";
    } else {
      statusKind = "active";
    }

    return {
      statusKind,
      loginId,
      hasAccount,
      mustChangePassword,
      passwordIssuedAt: staff.user?.passwordIssuedAt?.toISOString() ?? null,
      accountCreatedAt: staff.user?.createdAt?.toISOString() ?? null,
      staffName: staff.name,
      staffActive: staff.isActive,
      activeSetupExpiresAt: null,
      activeResetExpiresAt: null,
    };
  },

  /**
   * @deprecated 설정 링크 신규 발급 차단. UI는 직접 계정 생성을 사용한다.
   */
  async createSetupLink(
    actor: ActorContext,
    staffId: string,
  ): Promise<{
    url: string;
    expiresAt: Date;
    message: string;
  }> {
    void actor;
    void staffId;
    throw new AppError(
      "FORBIDDEN",
      "설정 링크 발급은 더 이상 지원하지 않습니다. 로그인 계정 만들기를 이용해 주세요.",
    );
  },

  /**
   * @deprecated 재설정 링크 신규 발급 차단.
   */
  async createPasswordResetLink(
    actor: ActorContext,
    staffId: string,
  ): Promise<{
    url: string;
    expiresAt: Date;
    message: string;
    loginId: string;
  }> {
    void actor;
    void staffId;
    throw new AppError(
      "FORBIDDEN",
      "비밀번호 재설정 링크는 더 이상 지원하지 않습니다. 임시 비밀번호 재설정을 이용해 주세요.",
    );
  },

  async createLoginAccount(
    actor: ActorContext,
    staffId: string,
    input: {
      loginId: string;
      temporaryPassword: string;
      temporaryPasswordConfirm: string;
    },
  ): Promise<{
    staffId: string;
    userId: string;
    loginId: string;
    mustChangePassword: true;
    createdAt: string;
  }> {
    const { access, staff } = await assertGymCanManageStaffAccount(
      actor,
      staffId,
    );

    if (!staff.isActive) {
      throw new AppError(
        "FORBIDDEN",
        "퇴사 또는 비활성 상태의 선생님에게는 계정을 만들 수 없습니다.",
      );
    }
    if (staff.userId) {
      throw new AppError(
        "CONFLICT",
        "이미 로그인 계정이 연결된 선생님입니다.",
      );
    }

    const loginId = parseLoginId(input.loginId);
    if (input.temporaryPassword !== input.temporaryPasswordConfirm) {
      throw new AppError(
        "VALIDATION_ERROR",
        "임시 비밀번호 확인이 일치하지 않습니다.",
      );
    }
    const password = parsePassword(input.temporaryPassword, loginId);

    if (await userRepository.isLoginIdTaken(loginId)) {
      throw new AppError("CONFLICT", "이미 사용 중인 로그인 아이디입니다.");
    }
    const authEmail = loginIdToAuthEmail(loginId);
    if (await userRepository.isAuthEmailTaken(authEmail)) {
      throw new AppError("CONFLICT", "이미 사용 중인 로그인 아이디입니다.");
    }

    const account = await createGymStaffLoginAccount({
      loginId,
      password,
      name: staff.name,
      mustChangePassword: true,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await gymStaffRepository.linkUserId(tx, staffId, account.userId);
        await revokeActiveSetupTokens(staffId, undefined, tx);
        await revokeActiveResetTokens(staffId, undefined, tx);
        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: AuditAction.gym_staff_account_setup_completed,
            targetType: "GymStaff",
            targetId: staffId,
            afterData: {
              userId: account.userId,
              loginId: account.loginId,
              mode: "owner_direct",
              mustChangePassword: true,
              gymId: access.gymId,
            },
          },
          tx,
        );
      });
    } catch (e) {
      const supabase = await ensureSupabaseAdmin();
      const linked = await prisma.user.findUnique({
        where: { id: account.userId },
        select: { authUserId: true },
      });
      if (linked?.authUserId) {
        await supabase.auth.admin.deleteUser(linked.authUserId).catch(() => undefined);
      }
      await prisma.user.delete({ where: { id: account.userId } }).catch(() => undefined);
      throw e;
    }

    return {
      staffId,
      userId: account.userId,
      loginId: account.loginId,
      mustChangePassword: true,
      createdAt: account.createdAt.toISOString(),
    };
  },

  async resetTemporaryPassword(
    actor: ActorContext,
    staffId: string,
    input: {
      temporaryPassword: string;
      temporaryPasswordConfirm: string;
    },
  ): Promise<{
    staffId: string;
    userId: string;
    loginId: string;
    mustChangePassword: true;
  }> {
    const { access, staff } = await assertGymCanManageStaffAccount(
      actor,
      staffId,
    );

    if (!staff.isActive) {
      throw new AppError(
        "FORBIDDEN",
        "퇴사 또는 비활성 상태의 선생님 계정은 재설정할 수 없습니다.",
      );
    }
    if (!staff.userId || !staff.user?.loginId || !staff.user.authUserId) {
      throw new AppError(
        "NOT_FOUND",
        "연결된 로그인 계정이 없습니다. 먼저 계정을 만들어 주세요.",
      );
    }

    if (input.temporaryPassword !== input.temporaryPasswordConfirm) {
      throw new AppError(
        "VALIDATION_ERROR",
        "임시 비밀번호 확인이 일치하지 않습니다.",
      );
    }
    const password = parsePassword(
      input.temporaryPassword,
      staff.user.loginId,
    );

    await updateSupabaseCredentials(staff.user.authUserId, { password });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId! },
        data: {
          mustChangePassword: true,
          passwordIssuedAt: now,
          passwordResetAt: now,
        },
      });
      await revokeActiveSetupTokens(staffId, undefined, tx);
      await revokeActiveResetTokens(staffId, undefined, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_password_reset_completed,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: {
            userId: staff.userId,
            loginId: staff.user!.loginId,
            mode: "owner_temporary_password",
            mustChangePassword: true,
            gymId: access.gymId,
          },
        },
        tx,
      );
    });

    return {
      staffId,
      userId: staff.userId,
      loginId: staff.user.loginId,
      mustChangePassword: true,
    };
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
            userId: true,
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

    // 관장이 직접 계정을 만든 뒤 남은 링크는 사용 불가
    if (row.gymStaff.userId) {
      return {
        staffName: "",
        gymName: "",
        status: "used",
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

    if (tokenRow.gymStaff.userId) {
      throw new AppError(
        "FORBIDDEN",
        "이미 로그인 계정이 연결된 선생님입니다. 로그인 화면에서 로그인해 주세요.",
      );
    }

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
      mustChangePassword: false,
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
