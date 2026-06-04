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
import { creditService } from "@/lib/services/credit.service";
import { manualChargeSchema } from "@/lib/validators/credit.validator";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(
        permissionReasonToActionCode(e.reason),
        e.message,
      );
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function adminManualChargeAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ balanceAfter: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = manualChargeSchema.safeParse({
      organizerId: formReq(formData, "organizerId"),
      amount: formReq(formData, "amount"),
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await creditService.addCreditsManually({
      organizerId: parsed.data.organizerId,
      amount: parsed.data.amount,
      memo: parsed.data.memo,
      actor,
    });

    return actionSuccess({ balanceAfter: result.balanceAfter });
  });
}
