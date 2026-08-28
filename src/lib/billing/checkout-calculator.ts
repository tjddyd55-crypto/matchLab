/**
 * MATCHON SaaS billing checkout math — pure, server-trusted.
 * Client must never supply final amounts; only planId + couponCode.
 */

export type BillingCouponTypeCode = "FREE_MONTHS" | "PERCENT" | "FIXED_AMOUNT";
export type BillingApplicablePlanCode = "ALL" | "MONTHLY" | "YEARLY";
export type BillingPlanIntervalCode = "MONTH" | "YEAR";

export type CheckoutPlanInput = {
  id: string;
  code: string;
  name: string;
  interval: BillingPlanIntervalCode;
  price: number;
  isActive: boolean;
};

export type CheckoutCouponInput = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: BillingCouponTypeCode;
  freeMonths: number | null;
  percentOff: number | null;
  fixedAmountOff: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number;
  applicablePlan: BillingApplicablePlanCode;
  isActive: boolean;
};

export type CheckoutCouponErrorCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "USER_LIMIT"
  | "PLAN_MISMATCH"
  | "INVALID_CONFIG";

export class CheckoutCouponError extends Error {
  constructor(
    public readonly errorCode: CheckoutCouponErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutCouponError";
  }
}

export type CheckoutCalculation = {
  plan: CheckoutPlanInput;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  freeMonths: number;
  trialEndAt: Date | null;
  coupon: {
    id: string;
    code: string;
    name: string;
    type: BillingCouponTypeCode;
    benefitLabel: string;
  } | null;
};

export function normalizeCouponCode(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

export function addYears(from: Date, years: number): Date {
  return addMonths(from, years * 12);
}

export function periodEndForInterval(
  interval: BillingPlanIntervalCode,
  from: Date,
): Date {
  return interval === "YEAR" ? addYears(from, 1) : addMonths(from, 1);
}

export function planCodeToApplicable(
  planCode: string,
): BillingApplicablePlanCode {
  const c = planCode.trim().toUpperCase();
  if (c === "YEARLY" || c === "YEAR") return "YEARLY";
  if (c === "MONTHLY" || c === "MONTH") return "MONTHLY";
  return "ALL";
}

function couponAppliesToPlan(
  applicable: BillingApplicablePlanCode,
  planCode: string,
): boolean {
  if (applicable === "ALL") return true;
  return applicable === planCodeToApplicable(planCode);
}

export function assertCouponUsable(input: {
  coupon: CheckoutCouponInput | null;
  plan: CheckoutPlanInput;
  now?: Date;
  userRedemptionCount?: number;
}): CheckoutCouponInput {
  const now = input.now ?? new Date();
  const coupon = input.coupon;
  if (!coupon) {
    throw new CheckoutCouponError("NOT_FOUND", "존재하지 않는 쿠폰입니다.");
  }
  if (!coupon.isActive) {
    throw new CheckoutCouponError("INACTIVE", "사용할 수 없는 쿠폰입니다.");
  }
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CheckoutCouponError(
      "NOT_STARTED",
      "아직 사용할 수 없는 쿠폰입니다.",
    );
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new CheckoutCouponError(
      "EXPIRED",
      "사용기간이 종료된 쿠폰입니다.",
    );
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.redemptionCount >= coupon.maxRedemptions
  ) {
    throw new CheckoutCouponError(
      "EXHAUSTED",
      "쿠폰 사용 가능 수량이 모두 소진되었습니다.",
    );
  }
  const userCount = input.userRedemptionCount ?? 0;
  if (userCount >= coupon.perUserLimit) {
    throw new CheckoutCouponError(
      "USER_LIMIT",
      "이미 사용한 쿠폰입니다.",
    );
  }
  if (!couponAppliesToPlan(coupon.applicablePlan, input.plan.code)) {
    throw new CheckoutCouponError(
      "PLAN_MISMATCH",
      "해당 요금제에는 사용할 수 없는 쿠폰입니다.",
    );
  }
  return coupon;
}

function benefitLabel(
  coupon: CheckoutCouponInput,
  discountAmount: number,
): string {
  if (coupon.type === "FREE_MONTHS") {
    return `${coupon.freeMonths ?? 0}개월 무료 이용`;
  }
  if (coupon.type === "PERCENT") {
    return `${coupon.percentOff ?? 0}% 할인 (−${discountAmount.toLocaleString("ko-KR")}원)`;
  }
  return `${(coupon.fixedAmountOff ?? 0).toLocaleString("ko-KR")}원 할인`;
}

/**
 * Server-side checkout preview / confirm shared calculator.
 */
export function calculateCheckout(input: {
  plan: CheckoutPlanInput;
  coupon?: CheckoutCouponInput | null;
  couponCode?: string | null;
  now?: Date;
  userRedemptionCount?: number;
}): CheckoutCalculation {
  const now = input.now ?? new Date();
  if (!input.plan.isActive) {
    throw new CheckoutCouponError(
      "INVALID_CONFIG",
      "선택하신 요금제는 현재 이용할 수 없습니다.",
    );
  }
  if (input.plan.price < 0) {
    throw new CheckoutCouponError(
      "INVALID_CONFIG",
      "요금제 금액이 올바르지 않습니다.",
    );
  }

  const originalAmount = input.plan.price;
  const code = normalizeCouponCode(input.couponCode);
  const wantsCoupon = Boolean(code) || input.coupon != null;

  if (!wantsCoupon) {
    return {
      plan: input.plan,
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      freeMonths: 0,
      trialEndAt: null,
      coupon: null,
    };
  }

  const coupon = assertCouponUsable({
    coupon: input.coupon ?? null,
    plan: input.plan,
    now,
    userRedemptionCount: input.userRedemptionCount,
  });

  let discountAmount = 0;
  let freeMonths = 0;
  let finalAmount = originalAmount;
  let trialEndAt: Date | null = null;

  if (coupon.type === "FREE_MONTHS") {
    freeMonths = Number(coupon.freeMonths ?? 0);
    if (!Number.isInteger(freeMonths) || freeMonths < 1 || freeMonths > 36) {
      throw new CheckoutCouponError(
        "INVALID_CONFIG",
        "쿠폰 설정이 올바르지 않습니다.",
      );
    }
    discountAmount = originalAmount;
    finalAmount = 0;
    trialEndAt = addMonths(now, freeMonths);
  } else if (coupon.type === "PERCENT") {
    const pct = Number(coupon.percentOff ?? 0);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new CheckoutCouponError(
        "INVALID_CONFIG",
        "쿠폰 설정이 올바르지 않습니다.",
      );
    }
    discountAmount = Math.round((originalAmount * pct) / 100);
    finalAmount = Math.max(0, originalAmount - discountAmount);
  } else if (coupon.type === "FIXED_AMOUNT") {
    const off = Number(coupon.fixedAmountOff ?? 0);
    if (!Number.isFinite(off) || off <= 0) {
      throw new CheckoutCouponError(
        "INVALID_CONFIG",
        "쿠폰 설정이 올바르지 않습니다.",
      );
    }
    discountAmount = Math.min(originalAmount, off);
    finalAmount = Math.max(0, originalAmount - discountAmount);
  } else {
    throw new CheckoutCouponError(
      "INVALID_CONFIG",
      "지원하지 않는 쿠폰 유형입니다.",
    );
  }

  return {
    plan: input.plan,
    originalAmount,
    discountAmount,
    finalAmount,
    freeMonths,
    trialEndAt,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      benefitLabel: benefitLabel(coupon, discountAmount),
    },
  };
}

export function isEntitledSubscription(input: {
  status: string;
  trialEndAt: Date | null;
  currentPeriodEnd: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.status === "ACTIVE") {
    if (input.currentPeriodEnd && input.currentPeriodEnd < now) {
      return false;
    }
    return true;
  }
  if (input.status === "TRIAL") {
    return Boolean(input.trialEndAt && input.trialEndAt >= now);
  }
  if (input.status === "CANCELLED") {
    return Boolean(input.currentPeriodEnd && input.currentPeriodEnd >= now);
  }
  return false;
}

export function yearlySavingsLabel(monthlyPrice: number, yearlyPrice: number): {
  savedAmount: number;
  percentOff: number;
} | null {
  const yearlyIfMonthly = monthlyPrice * 12;
  if (yearlyIfMonthly <= yearlyPrice) return null;
  const savedAmount = yearlyIfMonthly - yearlyPrice;
  const percentOff = Math.round((savedAmount / yearlyIfMonthly) * 100);
  return { savedAmount, percentOff };
}
