"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { eventStaffAccessService } from "@/lib/services/event-staff-access.service";
import { matchService } from "@/lib/services/match.service";
import { resultService } from "@/lib/services/result.service";
import {
  recordMatchOutcomeDraftSchema,
  updateMatchStatusSchema,
} from "@/lib/validators/match.validator";
import { confirmMatchResultsSchema } from "@/lib/validators/result.validator";

function mapStaff<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
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

export async function staffUpdateMatchStatusAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapStaff(async () => {
    const token = formReq(formData, "staffToken");
    const link = await eventStaffAccessService.assertRecorderLink(token);

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

    await matchService.updateMatchStatusStaff(link, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function staffRecordMatchOutcomeDraftAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapStaff(async () => {
    const token = formReq(formData, "staffToken");
    const link = await eventStaffAccessService.assertRecorderLink(token);

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

    await matchService.recordMatchOutcomeDraftStaff(link, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

/** 결과 입력 링크로 확정 — 계정 없이 staff 링크로만 구분 */
export async function staffConfirmMatchResultsAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapStaff(async () => {
    const token = formReq(formData, "staffToken");
    const link = await eventStaffAccessService.assertRecorderLink(token);

    const parsed = confirmMatchResultsSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      outcomeMode: formReq(formData, "outcomeMode"),
      winnerId: formReq(formData, "winnerId") || undefined,
      resultType: formReq(formData, "resultType"),
      resultMemo: formReq(formData, "resultMemo") || undefined,
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결과 확정 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await resultService.confirmMatchResults(
      { kind: "staff", link },
      parsed.data,
    );
    return actionSuccess({ ok: true as const });
  });
}

/** 접속 코드가 있는 링크 — 검증 후 이 브라우저에서만 경기 패널 사용 가능 */
export async function unlockStaffRecorderAccessAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapStaff(async () => {
    const token = formReq(formData, "token");
    const accessCode = formReq(formData, "accessCode");
    await eventStaffAccessService.unlockRecorderWithAccessCode(
      token,
      accessCode,
    );
    return actionSuccess({ ok: true as const });
  });
}
