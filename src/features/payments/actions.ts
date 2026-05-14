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
import { paymentService } from "@/lib/services/payment.service";
import { updatePaymentStatusSchema } from "@/lib/validators/application.validator";

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
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function confirmBankPaymentAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = updatePaymentStatusSchema.safeParse({
      paymentId: formReq(formData, "paymentId"),
      depositorName: formReq(formData, "depositorName") || undefined,
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결제 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await paymentService.confirmBankPayment(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function markPaymentPendingCheckAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = updatePaymentStatusSchema.safeParse({
      paymentId: formReq(formData, "paymentId"),
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결제 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await paymentService.markPaymentPendingCheck(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function markPaymentRefundedAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = updatePaymentStatusSchema.safeParse({
      paymentId: formReq(formData, "paymentId"),
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결제 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await paymentService.markPaymentRefunded(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function markPaymentWaivedAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = updatePaymentStatusSchema.safeParse({
      paymentId: formReq(formData, "paymentId"),
      memo: formReq(formData, "memo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결제 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await paymentService.markPaymentWaived(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function confirmBankPaymentFormAction(
  formData: FormData,
): Promise<void> {
  await confirmBankPaymentAction(formData);
}

export async function markPaymentPendingCheckFormAction(
  formData: FormData,
): Promise<void> {
  await markPaymentPendingCheckAction(formData);
}

export async function markPaymentRefundedFormAction(
  formData: FormData,
): Promise<void> {
  await markPaymentRefundedAction(formData);
}

export async function markPaymentWaivedFormAction(
  formData: FormData,
): Promise<void> {
  await markPaymentWaivedAction(formData);
}
