import { NextResponse } from "next/server";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { billingService } from "@/lib/services/billing.service";
import { billingCheckoutPreviewSchema } from "@/lib/validators/billing.validator";

export async function POST(request: Request) {
  try {
    const actor = await requireActorFromMutation();
    const body = await request.json();
    const parsed = billingCheckoutPreviewSchema.parse(body);
    const data = await billingService.previewCheckout({
      actor,
      planId: parsed.planId,
      couponCode: parsed.couponCode,
    });
    return NextResponse.json({
      plan: data.plan,
      originalAmount: data.originalAmount,
      discountAmount: data.discountAmount,
      finalAmount: data.finalAmount,
      freeMonths: data.freeMonths,
      trialEndAt: data.trialEndAt?.toISOString() ?? null,
      coupon: data.coupon,
    });
  } catch (e) {
    const message =
      e instanceof AppError
        ? e.message
        : e instanceof Error
          ? e.message
          : "미리보기에 실패했습니다.";
    const status =
      e instanceof AppError && e.code === "UNAUTHORIZED"
        ? 401
        : e instanceof AppError && e.code === "FORBIDDEN"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
