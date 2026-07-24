"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import {
  gymManualSaleCreateSchema,
  gymReceivableCollectSchema,
  gymReceivableCreateSchema,
  gymRefundCreateSchema,
} from "@/lib/validators/gym-sales.validator";

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

function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function formObj(formData: FormData, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) {
    o[k] = formStr(formData, k);
  }
  return o;
}

function revalidateSalesPaths(memberId?: string) {
  revalidatePath("/gym");
  revalidatePath("/gym/sales");
  revalidatePath("/gym/sales/receivables");
  if (memberId) revalidatePath(`/gym/members/${memberId}`);
}

export async function createGymManualSaleAction(
  formData: FormData,
): Promise<ActionResult<{ saleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymManualSaleCreateSchema.safeParse(
      formObj(formData, [
        "title",
        "amount",
        "listPrice",
        "discountAmount",
        "soldAt",
        "paymentMethod",
        "category",
        "gymMemberId",
        "memo",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const created = await gymSalesService.createManualSale(actor, parsed.data);
    revalidateSalesPaths(parsed.data.gymMemberId);
    return actionSuccess({ saleId: created.id });
  });
}

export async function createGymRefundAction(
  formData: FormData,
): Promise<ActionResult<{ refundId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymRefundCreateSchema.safeParse(
      formObj(formData, [
        "paymentId",
        "manualSaleId",
        "amount",
        "refundedAt",
        "refundMethod",
        "reason",
        "memo",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    if (!parsed.data.paymentId && !parsed.data.manualSaleId) {
      return actionFailure("VALIDATION_ERROR", "환불 대상을 지정해 주세요.");
    }
    const created = await gymSalesService.createRefund(actor, parsed.data);
    revalidateSalesPaths();
    return actionSuccess({ refundId: created.id });
  });
}

export async function createGymReceivableAction(
  formData: FormData,
): Promise<ActionResult<{ receivableId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymReceivableCreateSchema.safeParse(
      formObj(formData, [
        "gymMemberId",
        "title",
        "totalAmount",
        "dueDate",
        "category",
        "subscriptionId",
        "memo",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const created = await gymSalesService.createReceivable(actor, parsed.data);
    revalidateSalesPaths(parsed.data.gymMemberId);
    return actionSuccess({ receivableId: created.id });
  });
}

export async function collectGymReceivableAction(
  receivableId: string,
  formData: FormData,
): Promise<ActionResult<{ paymentId: string; remaining: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymReceivableCollectSchema.safeParse(
      formObj(formData, ["amount", "paidAt", "paymentMethod", "memo"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymSalesService.collectReceivablePayment(
      actor,
      receivableId,
      parsed.data,
    );
    revalidateSalesPaths();
    return actionSuccess({
      paymentId: result.payment.id,
      remaining: result.remaining,
    });
  });
}

export async function cancelGymReceivableAction(
  receivableId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymSalesService.cancelReceivable(actor, receivableId);
    revalidateSalesPaths();
    return actionSuccess({ ok: true });
  });
}

export async function cancelGymManualSaleAction(
  saleId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymSalesService.cancelManualSale(actor, saleId);
    revalidateSalesPaths();
    return actionSuccess({ ok: true });
  });
}
