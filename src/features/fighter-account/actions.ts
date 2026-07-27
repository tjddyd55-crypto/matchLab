"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  checkFighterLoginIdLookupRateLimit,
  checkFighterResetCompleteRateLimit,
  checkFighterSetupCompleteRateLimit,
} from "@/lib/fighter-account/rate-limit";
import { hashFighterAccountToken } from "@/lib/fighter-account/token";
import { fighterAccountSetupService } from "@/lib/services/fighter-account-setup.service";

function mapError(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) {
    return actionFailure("FORBIDDEN", e.message || "권한이 없습니다.");
  }
  if (e instanceof AppError) {
    return actionFailure(
      e.code === "VALIDATION_ERROR"
        ? "VALIDATION_ERROR"
        : e.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : e.code === "CONFLICT"
            ? "CONFLICT"
            : e.code === "INTERNAL"
              ? "INTERNAL"
              : "FORBIDDEN",
      e.message,
      e.details,
    );
  }
  console.error("[fighter-account]", e instanceof Error ? e.message : "error");
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

function revalidateFighterEdit(fighterId: string) {
  revalidatePath(`/gym/fighters/${fighterId}/edit`);
  revalidatePath("/gym/fighters");
}

export async function createFighterAccountSetupLinkAction(fighterId: string) {
  try {
    const actor = await requireActorFromMutation();
    const result = await fighterAccountSetupService.createSetupLink(
      actor,
      fighterId,
    );
    revalidateFighterEdit(fighterId);
    return actionSuccess({
      url: result.url,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
    });
  } catch (e) {
    return mapError(e);
  }
}

export async function revokeFighterAccountSetupLinkAction(fighterId: string) {
  try {
    const actor = await requireActorFromMutation();
    await fighterAccountSetupService.revokeSetupLink(actor, fighterId);
    revalidateFighterEdit(fighterId);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function createFighterPasswordResetLinkAction(fighterId: string) {
  try {
    const actor = await requireActorFromMutation();
    const result = await fighterAccountSetupService.createPasswordResetLink(
      actor,
      fighterId,
    );
    revalidateFighterEdit(fighterId);
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

export async function checkFighterAccountLoginIdAction(input: {
  loginId: string;
  /** setup token이 있으면 연결된 User를 exclude */
  setupToken?: string | null;
}) {
  try {
    const ip = await clientIp();
    const rate = checkFighterLoginIdLookupRateLimit(ip);
    if (!rate.ok) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    let excludeUserId: string | null = null;
    if (input.setupToken?.trim()) {
      excludeUserId =
        await fighterAccountSetupService.resolveExcludeUserIdForSetupToken(
          input.setupToken,
        );
    }
    const result = await fighterAccountSetupService.isLoginIdAvailable(
      input.loginId,
      excludeUserId,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function completeFighterAccountSetupAction(input: {
  token: string;
  loginId: string;
  password: string;
  passwordConfirm: string;
}) {
  try {
    const tokenHashPrefix = hashFighterAccountToken(input.token).slice(0, 12);
    const rate = checkFighterSetupCompleteRateLimit(tokenHashPrefix);
    if (!rate.ok) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    const result = await fighterAccountSetupService.completeSetup(input.token, {
      loginId: input.loginId,
      password: input.password,
      passwordConfirm: input.passwordConfirm,
    });
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function completeFighterPasswordResetAction(input: {
  token: string;
  password: string;
  passwordConfirm: string;
}) {
  try {
    const tokenHashPrefix = hashFighterAccountToken(input.token).slice(0, 12);
    const rate = checkFighterResetCompleteRateLimit(tokenHashPrefix);
    if (!rate.ok) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    const result = await fighterAccountSetupService.completePasswordReset(
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
