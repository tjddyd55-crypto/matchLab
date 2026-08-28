import { z } from "zod";
import {
  BillingCouponApplicablePlan,
  BillingCouponType,
} from "@/lib/enums";

export const billingCheckoutPreviewSchema = z.object({
  planId: z.string().min(1),
  couponCode: z.string().trim().max(64).optional().nullable(),
});

export const billingCheckoutConfirmSchema = billingCheckoutPreviewSchema;

export const billingCouponCreateSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional().nullable(),
    type: z.nativeEnum(BillingCouponType),
    freeMonths: z.coerce.number().int().min(1).max(36).optional().nullable(),
    percentOff: z.coerce.number().int().min(1).max(100).optional().nullable(),
    fixedAmountOff: z.coerce.number().int().min(1).optional().nullable(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    maxRedemptions: z.coerce.number().int().min(1).optional().nullable(),
    perUserLimit: z.coerce.number().int().min(1).max(100).default(1),
    applicablePlan: z
      .nativeEnum(BillingCouponApplicablePlan)
      .default(BillingCouponApplicablePlan.ALL),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.type === BillingCouponType.FREE_MONTHS && !val.freeMonths) {
      ctx.addIssue({
        code: "custom",
        message: "무료 개월 수를 입력하세요.",
        path: ["freeMonths"],
      });
    }
    if (val.type === BillingCouponType.PERCENT && !val.percentOff) {
      ctx.addIssue({
        code: "custom",
        message: "할인율을 입력하세요.",
        path: ["percentOff"],
      });
    }
    if (val.type === BillingCouponType.FIXED_AMOUNT && !val.fixedAmountOff) {
      ctx.addIssue({
        code: "custom",
        message: "할인 금액을 입력하세요.",
        path: ["fixedAmountOff"],
      });
    }
  });

export const billingPlanUpdateSchema = z.object({
  planId: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  price: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
