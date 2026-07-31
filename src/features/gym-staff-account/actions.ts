"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import {
  checkGymStaffLoginIdLookupRateLimit,
  checkGymStaffResetCompleteRateLimit,
  checkGymStaffSetupCompleteRateLimit,
} from "@/lib/gym-staff-account/rate-limit";
import { hashGymStaffAccountToken } from "@/lib/gym-staff-account/token";
import { gymStaffAccountSetupService } from "@/lib/services/gym-staff-account-setup.service";

function mapError(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) {
    return actionFailure("FORBIDDEN", e.message || "권한이 없습니다.");
  }
  if (e instanceof AppError) {
    return actionFailure(e.code, e.message, e.details);
  }
  console.error("[gym-staff-account]", e instanceof Error ? e.message : "error");
  return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

function revalidateStaffDetail(staffId: string) {
  revalidatePath(`/gym/staff/${staffId}`);
  revalidatePath("/gym/staff");
}

const RATE_LIMITED_MESSAGE =
  "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

export async function createGymStaffAccountSetupLinkAction(staffId: string) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymStaffAccountSetupService.createSetupLink(
      actor,
      staffId,
    );
    revalidateStaffDetail(staffId);
    return actionSuccess({
      url: result.url,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
    });
  } catch (e) {
    return mapError(e);
  }
}

export async function revokeGymStaffAccountSetupLinkAction(staffId: string) {
  try {
    const actor = await requireActorFromMutation();
    await gymStaffAccountSetupService.revokeSetupLink(actor, staffId);
    revalidateStaffDetail(staffId);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function createGymStaffPasswordResetLinkAction(staffId: string) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymStaffAccountSetupService.createPasswordResetLink(
      actor,
      staffId,
    );
    revalidateStaffDetail(staffId);
    return actionSuccess({
      url: result.url,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
      loginId: result.loginId,
    });
  } catch (e) {
    return mapError(e);
  }
}

export async function createGymStaffLoginAccountAction(input: {
  staffId: string;
  loginId: string;
  temporaryPassword: string;
  temporaryPasswordConfirm: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymStaffAccountSetupService.createLoginAccount(
      actor,
      input.staffId,
      {
        loginId: input.loginId,
        temporaryPassword: input.temporaryPassword,
        temporaryPasswordConfirm: input.temporaryPasswordConfirm,
      },
    );
    revalidateStaffDetail(input.staffId);
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function resetGymStaffTemporaryPasswordAction(input: {
  staffId: string;
  temporaryPassword: string;
  temporaryPasswordConfirm: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymStaffAccountSetupService.resetTemporaryPassword(
      actor,
      input.staffId,
      {
        temporaryPassword: input.temporaryPassword,
        temporaryPasswordConfirm: input.temporaryPasswordConfirm,
      },
    );
    revalidateStaffDetail(input.staffId);
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function checkGymStaffAccountLoginIdAction(input: {
  loginId: string;
  /** setup token이 있으면 연결된 User를 중복 검사에서 제외 */
  setupToken?: string | null;
}) {
  try {
    const rate = checkGymStaffLoginIdLookupRateLimit(await clientIp());
    if (!rate.ok) {
      return actionFailure("VALIDATION_ERROR", RATE_LIMITED_MESSAGE);
    }

    let excludeUserId: string | null = null;
    if (input.setupToken?.trim()) {
      excludeUserId =
        await gymStaffAccountSetupService.resolveExcludeUserIdForSetupToken(
          input.setupToken,
        );
    }
    const result = await gymStaffAccountSetupService.isLoginIdAvailable(
      input.loginId,
      excludeUserId,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function completeGymStaffAccountSetupAction(input: {
  token: string;
  loginId: string;
  password: string;
  passwordConfirm: string;
}) {
  try {
    const rate = checkGymStaffSetupCompleteRateLimit(
      hashGymStaffAccountToken(input.token).slice(0, 12),
    );
    if (!rate.ok) {
      return actionFailure("VALIDATION_ERROR", RATE_LIMITED_MESSAGE);
    }
    const result = await gymStaffAccountSetupService.completeSetup(input.token, {
      loginId: input.loginId,
      password: input.password,
      passwordConfirm: input.passwordConfirm,
    });
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function completeGymStaffPasswordResetAction(input: {
  token: string;
  password: string;
  passwordConfirm: string;
}) {
  try {
    const rate = checkGymStaffResetCompleteRateLimit(
      hashGymStaffAccountToken(input.token).slice(0, 12),
    );
    if (!rate.ok) {
      return actionFailure("VALIDATION_ERROR", RATE_LIMITED_MESSAGE);
    }
    const result = await gymStaffAccountSetupService.completePasswordReset(
      input.token,
      {
        password: input.password,
        passwordConfirm: input.passwordConfirm,
      },
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}
