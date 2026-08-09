import { z } from "zod";
import { GymMemberPaymentMethod, GymSalesCategory } from "@/lib/enums";
import { isValidDateOnlyString } from "@/lib/date-only";

const optionalDateOnly = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === "" ? undefined : s))
  .refine((s) => s === undefined || isValidDateOnlyString(s), {
    message: "날짜 형식이 올바르지 않습니다.",
  });

const wonInt = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}, z.number().int());

const paymentMethodEnum = z.nativeEnum(GymMemberPaymentMethod);
const categoryEnum = z.nativeEnum(GymSalesCategory);

const optionalWonInt = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}, z.number().int().nonnegative().optional());

const wonIntOrZero = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}, z.number().int().nonnegative());

export const gymManualSaleCreateSchema = z.object({
  title: z.string().trim().min(1, "항목명을 입력해 주세요.").max(120),
  amount: wonInt.pipe(z.number().int().positive("금액을 입력해 주세요.")),
  listPrice: optionalWonInt,
  discountAmount: wonIntOrZero,
  soldAt: optionalDateOnly,
  paymentMethod: paymentMethodEnum.optional().default(GymMemberPaymentMethod.cash),
  category: categoryEnum.optional().default(GymSalesCategory.other),
  gymMemberId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  productId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

/** 통합 매출 등록 (판매금액/결제금액 → ManualSale 또는 Receivable) */
export const gymSalesEntryCreateSchema = z.object({
  title: z.string().trim().min(1, "항목명을 입력해 주세요.").max(120),
  saleAmount: wonInt.pipe(z.number().int().positive("판매금액을 입력해 주세요.")),
  paidAmount: wonIntOrZero,
  soldAt: optionalDateOnly,
  paymentMethod: paymentMethodEnum.optional().default(GymMemberPaymentMethod.cash),
  category: categoryEnum.optional().default(GymSalesCategory.other),
  gymMemberId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  productId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

export const gymRefundCreateSchema = z.object({
  paymentId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  manualSaleId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  amount: wonInt.pipe(z.number().int().positive("환불금액을 입력해 주세요.")),
  refundedAt: optionalDateOnly,
  refundMethod: paymentMethodEnum.optional().default(GymMemberPaymentMethod.cash),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

export const gymReceivableCreateSchema = z.object({
  gymMemberId: z.string().trim().min(1, "회원을 선택해 주세요."),
  title: z.string().trim().min(1, "결제 항목을 입력해 주세요.").max(120),
  totalAmount: wonInt.pipe(z.number().int().positive("청구금액을 입력해 주세요.")),
  dueDate: optionalDateOnly,
  category: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    categoryEnum.optional(),
  ),
  subscriptionId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  productId: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

export const gymReceivableCollectSchema = z.object({
  amount: wonInt.pipe(z.number().int().positive("납부금액을 입력해 주세요.")),
  paidAt: optionalDateOnly,
  paymentMethod: paymentMethodEnum.optional().default(GymMemberPaymentMethod.cash),
  memo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});
