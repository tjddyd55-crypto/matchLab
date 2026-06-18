"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { matchService } from "@/lib/services/match.service";
import {
  cancelMatchSchema,
  recordMatchOutcomeDraftSchema,
  updateMatchStatusSchema,
} from "@/lib/validators/match.validator";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function resolveFormData(a: unknown, b?: FormData): FormData | null {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return null;
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** 성공 후 `router.refresh()` 또는 `queryKeys.matches.*` 무효화 */
export async function updateMatchStatusAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = updateMatchStatusSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      status: formReq(formData, "status"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await matchService.updateMatchStatus(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function recordMatchOutcomeDraftAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = recordMatchOutcomeDraftSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      outcomeMode: formReq(formData, "outcomeMode"),
      winnerId: formReq(formData, "winnerId") || undefined,
      loserId: formReq(formData, "loserId") || undefined,
      resultType: formReq(formData, "resultType"),
      resultMemo: formReq(formData, "resultMemo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결과 입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await matchService.recordMatchOutcomeDraft(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function cancelMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = cancelMatchSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "경기 정보가 올바르지 않습니다.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await matchService.cancelMatch(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function updateMatchBoutSettingsAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const matchId = formReq(formData, "matchId");
    const isPublicSparring = formReq(formData, "isPublicSparring") === "true";
    if (!matchId) {
      return actionFailure("VALIDATION_ERROR", "경기를 선택해 주세요.");
    }
    const actor = await requireActorFromMutation();
    await matchService.updateMatchBoutSettings(actor, matchId, isPublicSparring);
    return actionSuccess({ ok: true as const });
  });
}
