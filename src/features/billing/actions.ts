"use server";

import { revalidatePath } from "next/cache";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { billingService } from "@/lib/services/billing.service";
import {
  billingCheckoutConfirmSchema,
  billingCheckoutPreviewSchema,
  billingCouponCreateSchema,
  billingPlanUpdateSchema,
} from "@/lib/validators/billing.validator";
import {
  BillingCouponApplicablePlan,
  BillingCouponType,
} from "@/lib/enums";

function errMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "요청을 처리하지 못했습니다.";
}

export async function previewBillingCheckoutAction(input: {
  planId: string;
  couponCode?: string | null;
}) {
  try {
    const actor = await requireActorFromMutation();
    const parsed = billingCheckoutPreviewSchema.parse(input);
    const result = await billingService.previewCheckout({
      actor,
      planId: parsed.planId,
      couponCode: parsed.couponCode,
    });
    return { ok: true as const, data: result };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function confirmBillingCheckoutAction(input: {
  planId: string;
  couponCode?: string | null;
}) {
  try {
    const actor = await requireActorFromMutation();
    const parsed = billingCheckoutConfirmSchema.parse(input);
    const result = await billingService.confirmCheckout({
      actor,
      planId: parsed.planId,
      couponCode: parsed.couponCode,
    });
    revalidatePath("/billing");
    revalidatePath("/gym");
    revalidatePath("/organizer");
    return { ok: true as const, data: result };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function prepareTossBillingCheckoutAction(input: {
  planId: string;
  couponCode?: string | null;
}) {
  try {
    const { billingLifecycleService } = await import(
      "@/lib/services/billing-lifecycle.service"
    );
    const actor = await requireActorFromMutation();
    const parsed = billingCheckoutConfirmSchema.parse(input);
    const data = await billingLifecycleService.prepareTossCheckout({
      actor,
      planId: parsed.planId,
      couponCode: parsed.couponCode,
    });
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function completeTossBillingAuthAction(input: {
  orderId: string;
  authKey: string;
  customerKey: string;
}) {
  try {
    const { billingLifecycleService } = await import(
      "@/lib/services/billing-lifecycle.service"
    );
    const actor = await requireActorFromMutation();
    const data = await billingLifecycleService.completeTossBillingAuth({
      actor,
      orderId: input.orderId,
      authKey: input.authKey,
      customerKey: input.customerKey,
    });
    revalidatePath("/billing");
    revalidatePath("/gym");
    revalidatePath("/organizer");
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function cancelBillingAtPeriodEndAction() {
  try {
    const { billingLifecycleService } = await import(
      "@/lib/services/billing-lifecycle.service"
    );
    const actor = await requireActorFromMutation();
    await billingLifecycleService.cancelAtPeriodEnd(actor);
    revalidatePath("/billing/account");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function preparePaymentMethodChangeAction() {
  try {
    const { billingLifecycleService } = await import(
      "@/lib/services/billing-lifecycle.service"
    );
    const actor = await requireActorFromMutation();
    const data = await billingLifecycleService.preparePaymentMethodChange(actor);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function completePaymentMethodChangeAction(input: {
  orderId: string;
  authKey: string;
  customerKey: string;
}) {
  try {
    const { billingLifecycleService } = await import(
      "@/lib/services/billing-lifecycle.service"
    );
    const actor = await requireActorFromMutation();
    const data = await billingLifecycleService.completePaymentMethodChange({
      actor,
      ...input,
    });
    revalidatePath("/billing/account");
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function adminCreateBillingCouponAction(formData: FormData) {
  const actor = await requireActorFromMutation();
  const type = String(formData.get("type") ?? "") as BillingCouponType;
  const applicablePlan = String(
    formData.get("applicablePlan") ?? "ALL",
  ) as BillingCouponApplicablePlan;

  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();

  const parsed = billingCouponCreateSchema.parse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    type,
    freeMonths: formData.get("freeMonths") || null,
    percentOff: formData.get("percentOff") || null,
    fixedAmountOff: formData.get("fixedAmountOff") || null,
    startsAt: startsRaw || null,
    expiresAt: expiresRaw || null,
    maxRedemptions: formData.get("maxRedemptions") || null,
    perUserLimit: formData.get("perUserLimit") || 1,
    applicablePlan,
    isActive: formData.get("isActive") !== "false",
  });

  await billingService.adminCreateCoupon(actor, {
    ...parsed,
    startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
  });
  revalidatePath("/admin/billing/coupons");
}

export async function adminToggleBillingCouponAction(input: {
  couponId: string;
  isActive: boolean;
}) {
  try {
    const actor = await requireActorFromMutation();
    await billingService.adminSetCouponActive(
      actor,
      input.couponId,
      input.isActive,
    );
    revalidatePath("/admin/billing/coupons");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function adminToggleBillingCouponFormAction(formData: FormData) {
  const couponId = String(formData.get("couponId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  await adminToggleBillingCouponAction({ couponId, isActive });
}

export async function adminUpdateBillingPlanAction(formData: FormData) {
  try {
    const actor = await requireActorFromMutation();
    const parsed = billingPlanUpdateSchema.parse({
      planId: formData.get("planId"),
      name: formData.get("name") || undefined,
      price: formData.get("price") || undefined,
      isActive: formData.getAll("isActive").includes("true"),
      sortOrder: formData.get("sortOrder") || undefined,
    });
    await billingService.adminUpdatePlan(actor, parsed.planId, {
      name: parsed.name,
      price: parsed.price,
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
    });
    revalidatePath("/admin/billing/plans");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function adminUpdateBillingPlanFormAction(formData: FormData) {
  await adminUpdateBillingPlanAction(formData);
}
