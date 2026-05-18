"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireRole } from "@/lib/permissions";
import { gymEventFeeRepository } from "@/lib/repositories/gym-event-fee.repository";
import { upsertGymEventFeeSettingSchema } from "@/lib/validators/event.validator";

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

export async function upsertGymEventFeeSettingAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) {
      return actionFailure("FORBIDDEN", "체육관 정보가 없습니다.");
    }

    const raw = {
      eventId: formReq(formData, "eventId"),
      athleteFeeAmount: Number(formReq(formData, "athleteFeeAmount")),
      note: formReq(formData, "note") || null,
    };

    const parsed = upsertGymEventFeeSettingSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "선수 안내 참가비 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await gymEventFeeRepository.upsert({
      gymId,
      eventId: parsed.data.eventId,
      athleteFeeAmount: parsed.data.athleteFeeAmount,
      note: parsed.data.note,
    });

    return actionSuccess({ ok: true as const });
  });
}
