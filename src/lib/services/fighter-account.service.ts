import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  generateTemporaryPassword,
  loginIdToAuthEmail,
  normalizeLoginId,
} from "@/lib/fighter-login";
import { prisma } from "@/lib/prisma";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { fighterAccountRepository } from "@/lib/repositories/fighter-account.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FighterRegistrationSubmissionStatus, UserRole } from "@/lib/enums";

export type FighterAccountProvisionResult = {
  userId: string;
  loginId: string;
  /** 1회 표시용 — DB 저장 금지 */
  temporaryPassword?: string;
  mustChangePassword: boolean;
};

async function ensureSupabaseAdmin() {
  try {
    return createSupabaseAdminClient();
  } catch (e) {
    throw new AppError(
      "INTERNAL",
      "선수 계정 발급을 위해 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.",
      e instanceof Error ? e.message : undefined,
    );
  }
}

async function createSupabaseAuthUser(input: {
  email: string;
  password: string;
}): Promise<string> {
  const supabase = await ensureSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
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
  return data.user.id;
}

async function updateSupabasePassword(authUserId: string, password: string) {
  const supabase = await ensureSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    password,
  });
  if (error) {
    throw new AppError(
      "INTERNAL",
      "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      error?.message,
    );
  }
}

export const fighterAccountService = {
  /** @deprecated authService.resolveAuthEmailForLogin 사용 */
  async resolveAuthEmailForLogin(identifier: string): Promise<string | null> {
    return authService.resolveAuthEmailForLogin(identifier);
  },

  async createFighterLoginAccount(input: {
    loginId: string;
    password: string;
    name: string;
    mustChangePassword: boolean;
  }): Promise<FighterAccountProvisionResult> {
    const loginId = normalizeLoginId(input.loginId);
    if (await fighterAccountRepository.isLoginIdTaken(loginId)) {
      throw new AppError("CONFLICT", "이미 사용 중인 아이디입니다.");
    }

    const authEmail = loginIdToAuthEmail(loginId);
    const authUserId = await createSupabaseAuthUser({
      email: authEmail,
      password: input.password,
    });

    const now = new Date();
    try {
      const user = await prisma.user.create({
        data: {
          authUserId,
          email: authEmail,
          loginId,
          name: input.name,
          role: UserRole.fighter,
          mustChangePassword: input.mustChangePassword,
          passwordIssuedAt: now,
        },
        select: { id: true },
      });

      return {
        userId: user.id,
        loginId,
        mustChangePassword: input.mustChangePassword,
        temporaryPassword: input.mustChangePassword
          ? input.password
          : undefined,
      };
    } catch (e) {
      const supabase = await ensureSupabaseAdmin();
      await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw e;
    }
  },

  async linkFighterToUserAccount(fighterId: string, userId: string) {
    const fighter = await fighterRepository.findFighterVisibilityContext(
      fighterId,
    );
    if (!fighter) {
      throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    }
    if (fighter.userId && fighter.userId !== userId) {
      throw new AppError(
        "CONFLICT",
        "이미 다른 로그인 계정이 연결된 선수입니다.",
      );
    }
    const existingFighter = await userRepository.getFighterIdByUserId(userId);
    if (existingFighter && existingFighter !== fighterId) {
      throw new AppError(
        "CONFLICT",
        "이 로그인 계정은 다른 선수에 연결되어 있습니다.",
      );
    }
    await prisma.fighter.update({
      where: { id: fighterId },
      data: { userId },
    });
  },

  async provisionAccountForGymFighter(
    actor: ActorContext,
    fighterId: string,
    input: {
      loginId: string;
      password?: string;
      autoGeneratePassword?: boolean;
    },
  ): Promise<FighterAccountProvisionResult> {
    requireRole(actor, ["gym", "admin"]);
    const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
    if (!ctx) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    if (ctx.userId) {
      throw new AppError("CONFLICT", "이미 로그인 계정이 연결된 선수입니다.");
    }

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

    const fighterRow = await fighterRepository.findFighterById(fighterId);
    const password =
      input.password?.trim() ||
      (input.autoGeneratePassword ? generateTemporaryPassword() : "");
    if (!password) {
      throw new AppError("VALIDATION_ERROR", "비밀번호를 입력해 주세요.");
    }

    const account = await fighterAccountService.createFighterLoginAccount({
      loginId: input.loginId,
      password,
      name: fighterRow?.name ?? "선수",
      mustChangePassword: true,
    });

    await fighterAccountService.linkFighterToUserAccount(
      fighterId,
      account.userId,
    );

    return {
      ...account,
      temporaryPassword: password,
    };
  },

  async resetFighterPassword(
    actor: ActorContext,
    fighterId: string,
    input?: { password?: string; autoGenerate?: boolean },
  ): Promise<{ loginId: string; temporaryPassword: string }> {
    requireRole(actor, ["gym", "admin"]);
    const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
    if (!ctx?.userId) {
      throw new AppError("NOT_FOUND", "로그인 계정이 연결되지 않은 선수입니다.");
    }

    const gymId = actor.gymId ?? ctx.currentGymId;
    if (!gymId) {
      throw new AppError("FORBIDDEN", "체육관 계정 설정이 필요합니다.");
    }
    await requireGymOwner(actor, gymId);

    const user = await userRepository.findUserById(ctx.userId);
    if (!user?.authUserId || !user.loginId) {
      throw new AppError("NOT_FOUND", "선수 로그인 계정을 찾을 수 없습니다.");
    }

    const temp =
      input?.password?.trim() ||
      (input?.autoGenerate !== false ? generateTemporaryPassword() : "");
    if (!temp) {
      throw new AppError("VALIDATION_ERROR", "새 비밀번호를 입력해 주세요.");
    }

    await updateSupabasePassword(user.authUserId, temp);
    await fighterAccountRepository.updatePasswordFlags(user.id, {
      mustChangePassword: true,
      passwordResetAt: new Date(),
    });

    return { loginId: user.loginId, temporaryPassword: temp };
  },

  async getFighterRegistrationGate(actor: ActorContext): Promise<
    | { kind: "ok"; fighterId: string }
    | { kind: "no_fighter_link" }
    | { kind: "pending"; gymName: string }
    | { kind: "rejected"; gymName: string }
  > {
    if (actor.role !== "fighter") return { kind: "ok", fighterId: "" };
    if (actor.fighterId) return { kind: "ok", fighterId: actor.fighterId };

    const pending =
      await fighterAccountRepository.findPendingRegistrationByPendingUserId(
        actor.userId,
      );
    if (!pending) return { kind: "no_fighter_link" };

    if (
      pending.status === FighterRegistrationSubmissionStatus.submitted ||
      pending.status === FighterRegistrationSubmissionStatus.duplicate_review
    ) {
      return { kind: "pending", gymName: pending.gym.name };
    }
    if (pending.status === FighterRegistrationSubmissionStatus.rejected) {
      return { kind: "rejected", gymName: pending.gym.name };
    }
    return { kind: "no_fighter_link" };
  },

  async createPendingRegistrationAccount(input: {
    loginId: string;
    password: string;
    name: string;
    submissionId: string;
  }): Promise<{ userId: string }> {
    const account = await fighterAccountService.createFighterLoginAccount({
      loginId: input.loginId,
      password: input.password,
      name: input.name,
      mustChangePassword: false,
    });
    await fighterAccountRepository.setSubmissionPendingUser(
      input.submissionId,
      account.userId,
      account.loginId,
    );
    return { userId: account.userId };
  },

  async approveLinkPendingUser(fighterId: string, pendingUserId: string) {
    await fighterAccountService.linkFighterToUserAccount(
      fighterId,
      pendingUserId,
    );
  },
};
