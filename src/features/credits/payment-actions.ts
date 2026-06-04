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
import { requireRole } from "@/lib/permissions";
import { creditPaymentService } from "@/lib/services/credit-payment.service";
import {
  cancelPaymentOrderSchema,
  confirmPaymentOrderSchema,
  createPaymentOrderSchema,
} from "@/lib/validators/credit-payment.validator";

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

function requireOrganizerId(
  actor: Awaited<ReturnType<typeof requireActorFromMutation>>,
): string {
  requireRole(actor, ["organizer", "admin"]);
  if (actor.role === "admin" && !actor.organizerId) {
    throw new AppError(
      "FORBIDDEN",
      "주최자 계정으로 로그인하거나 관리자 메뉴를 이용해 주세요.",
    );
  }
  const organizerId = actor.organizerId;
  if (!organizerId) {
    throw new AppError("FORBIDDEN", "주최자 정보가 없습니다.");
  }
  return organizerId;
}

export async function createCreditPaymentOrderAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  ActionResult<{
    orderId: string;
    amountKrw: number;
    credits: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const organizerId = requireOrganizerId(actor);
    const parsed = createPaymentOrderSchema.safeParse({
      planId: formReq(formData, "planId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "충전 상품을 선택해 주세요.");
    }

    const order = await creditPaymentService.createCreditPaymentOrder({
      organizerId,
      planId: parsed.data.planId,
      actor,
    });

    return actionSuccess({
      orderId: order.orderId,
      amountKrw: order.amountKrw,
      credits: order.credits,
    });
  });
}

export async function confirmCreditPaymentDevAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ credits: number; balanceAfter?: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = confirmPaymentOrderSchema.safeParse({
      orderId: formReq(formData, "orderId"),
      paymentKey: formReq(formData, "paymentKey") || undefined,
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "주문 정보가 올바르지 않습니다.");
    }

    const result = await creditPaymentService.confirmPaymentForOrganizerDev({
      orderId: parsed.data.orderId,
      actor,
    });

    return actionSuccess({
      credits: result.credits ?? 0,
    });
  });
}

export async function cancelCreditPaymentOrderAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = cancelPaymentOrderSchema.safeParse({
      orderId: formReq(formData, "orderId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "주문 정보가 올바르지 않습니다.");
    }

    await creditPaymentService.cancelCreditPayment({
      orderId: parsed.data.orderId,
      actor,
    });
    return actionSuccess({ ok: true as const });
  });
}
