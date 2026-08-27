import "server-only";

import { randomBytes } from "crypto";
import {
  BillingCouponApplicablePlan,
  BillingCouponType,
  BillingPaymentStatus,
  BillingPlanInterval,
  BillingSubscriptionStatus,
  type Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  calculateCheckout,
  CheckoutCouponError,
  normalizeCouponCode,
  type CheckoutCouponInput,
  type CheckoutPlanInput,
} from "@/lib/billing/checkout-calculator";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { AppError } from "@/lib/errors/app-error";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  billingCouponRedemptionRepository,
  billingCouponRepository,
  billingPaymentRepository,
  billingPlanRepository,
  billingSubscriptionRepository,
} from "@/lib/repositories/billing.repository";

function generateOrderId(): string {
  return `bill_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

function toPlanInput(plan: {
  id: string;
  code: string;
  name: string;
  interval: BillingPlanInterval;
  price: number;
  isActive: boolean;
}): CheckoutPlanInput {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    interval: plan.interval === BillingPlanInterval.YEAR ? "YEAR" : "MONTH",
    price: plan.price,
    isActive: plan.isActive,
  };
}

function toCouponInput(coupon: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: BillingCouponType;
  freeMonths: number | null;
  percentOff: number | null;
  fixedAmountOff: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number;
  applicablePlan: BillingCouponApplicablePlan;
  isActive: boolean;
}): CheckoutCouponInput {
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    type: coupon.type,
    freeMonths: coupon.freeMonths,
    percentOff: coupon.percentOff,
    fixedAmountOff: coupon.fixedAmountOff,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    maxRedemptions: coupon.maxRedemptions,
    redemptionCount: coupon.redemptionCount,
    perUserLimit: coupon.perUserLimit,
    applicablePlan: coupon.applicablePlan,
    isActive: coupon.isActive,
  };
}

function mapCouponError(e: unknown): never {
  if (e instanceof CheckoutCouponError) {
    throw new AppError("VALIDATION_ERROR", e.message, {
      couponError: e.errorCode,
    });
  }
  throw e;
}

function periodEndForPlan(
  interval: BillingPlanInterval,
  from: Date,
): Date {
  const d = new Date(from.getTime());
  if (interval === BillingPlanInterval.YEAR) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export const billingService = {
  async listActivePlans() {
    return billingPlanRepository.listActive();
  },

  async previewCheckout(input: {
    actor: ActorContext;
    planId: string;
    couponCode?: string | null;
  }) {
    requireRole(input.actor, ["gym", "organizer", "admin"]);
    const plan = await billingPlanRepository.findById(input.planId);
    if (!plan) {
      throw new AppError("NOT_FOUND", "요금제를 찾을 수 없습니다.");
    }

    const code = normalizeCouponCode(input.couponCode);
    let couponRow = null as Awaited<
      ReturnType<typeof billingCouponRepository.findByNormalizedCode>
    >;
    let userRedemptionCount = 0;
    if (code) {
      couponRow = await billingCouponRepository.findByNormalizedCode(code);
      if (couponRow) {
        userRedemptionCount =
          await billingCouponRedemptionRepository.countByUserAndCoupon(
            input.actor.userId,
            couponRow.id,
          );
      }
    }

    try {
      return calculateCheckout({
        plan: toPlanInput(plan),
        coupon: couponRow ? toCouponInput(couponRow) : null,
        couponCode: code || null,
        userRedemptionCount,
      });
    } catch (e) {
      mapCouponError(e);
    }
  },

  /**
   * Confirm checkout.
   * - finalAmount === 0 → activate TRIAL/ACTIVE without PG
   * - finalAmount > 0 → create READY payment; PG adapter (pgReady=false until connected)
   */
  async confirmCheckout(input: {
    actor: ActorContext;
    planId: string;
    couponCode?: string | null;
  }) {
    requireRole(input.actor, ["gym", "organizer"]);

    return prisma.$transaction(async (tx) => {
      const plan = await billingPlanRepository.findById(input.planId, tx);
      if (!plan || !plan.isActive) {
        throw new AppError("NOT_FOUND", "요금제를 찾을 수 없습니다.");
      }

      const code = normalizeCouponCode(input.couponCode);
      let couponRow = null as Awaited<
        ReturnType<typeof billingCouponRepository.findByNormalizedCode>
      >;
      let userRedemptionCount = 0;

      if (code) {
        couponRow = await billingCouponRepository.findByNormalizedCode(
          code,
          tx,
        );
        if (!couponRow) {
          throw new AppError("VALIDATION_ERROR", "존재하지 않는 쿠폰입니다.");
        }
        const locked = await billingCouponRepository.lockById(
          couponRow.id,
          tx,
        );
        if (!locked) {
          throw new AppError("VALIDATION_ERROR", "존재하지 않는 쿠폰입니다.");
        }
        couponRow = locked;
        userRedemptionCount =
          await billingCouponRedemptionRepository.countByUserAndCoupon(
            input.actor.userId,
            couponRow.id,
            tx,
          );
      }

      let calc;
      try {
        calc = calculateCheckout({
          plan: toPlanInput(plan),
          coupon: couponRow ? toCouponInput(couponRow) : null,
          couponCode: code || null,
          userRedemptionCount,
        });
      } catch (e) {
        mapCouponError(e);
      }

      const now = new Date();
      const orderId = generateOrderId();

      if (calc.finalAmount === 0) {
        const isTrial = calc.freeMonths > 0;
        const trialEndAt = calc.trialEndAt;
        const periodEnd = isTrial
          ? trialEndAt
          : periodEndForPlan(plan.interval, now);

        const subscription = await billingSubscriptionRepository.create(
          {
            user: { connect: { id: input.actor.userId } },
            plan: { connect: { id: plan.id } },
            status: isTrial
              ? BillingSubscriptionStatus.TRIAL
              : BillingSubscriptionStatus.ACTIVE,
            billingInterval: plan.interval,
            basePrice: calc.originalAmount,
            currentPrice: calc.finalAmount,
            startedAt: now,
            trialStartedAt: isTrial ? now : null,
            trialEndAt: isTrial ? trialEndAt : null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingAt: periodEnd,
            provider: "promo",
          },
          tx,
        );

        const payment = await billingPaymentRepository.create(
          {
            user: { connect: { id: input.actor.userId } },
            subscription: { connect: { id: subscription.id } },
            plan: { connect: { id: plan.id } },
            orderId,
            amount: 0,
            originalAmount: calc.originalAmount,
            discountAmount: calc.discountAmount,
            status: BillingPaymentStatus.PAID,
            paymentMethod: "promo",
            provider: "none",
            paidAt: now,
            metadata: {
              source: "zero_amount_activation",
              couponCode: calc.coupon?.code ?? null,
              freeMonths: calc.freeMonths,
            } as Prisma.InputJsonValue,
          },
          tx,
        );

        if (couponRow && calc.coupon) {
          await billingCouponRedemptionRepository.create(
            {
              coupon: { connect: { id: couponRow.id } },
              user: { connect: { id: input.actor.userId } },
              subscription: { connect: { id: subscription.id } },
              payment: { connect: { id: payment.id } },
              discountAmount: calc.discountAmount,
              freeMonths: calc.freeMonths || null,
            },
            tx,
          );
          await billingCouponRepository.incrementRedemptionCount(
            couponRow.id,
            tx,
          );
        }

        return {
          mode: "activated" as const,
          orderId,
          paymentId: payment.id,
          subscriptionId: subscription.id,
          status: subscription.status,
          finalAmount: 0,
          freeMonths: calc.freeMonths,
          trialEndAt: trialEndAt?.toISOString() ?? null,
          currentPeriodEnd: periodEnd?.toISOString() ?? null,
          plan: { id: plan.id, code: plan.code, name: plan.name },
          coupon: calc.coupon,
          pgReady: false as const,
        };
      }

      // Paid path — create READY order; do not fake PG success.
      const payment = await billingPaymentRepository.create(
        {
          user: { connect: { id: input.actor.userId } },
          plan: { connect: { id: plan.id } },
          orderId,
          amount: calc.finalAmount,
          originalAmount: calc.originalAmount,
          discountAmount: calc.discountAmount,
          status: BillingPaymentStatus.READY,
          provider: getPaymentProvider().name,
          metadata: {
            couponCode: calc.coupon?.code ?? null,
            planId: plan.id,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      // Reserve coupon redemption only after PG pay — store intent in metadata.
      // Do not increment redemption until paid (PG webhook/confirm).
      const provider = getPaymentProvider();
      const pg = await provider.createPayment({
        orderId,
        amount: calc.finalAmount,
        orderName: plan.name,
        customerKey: input.actor.userId,
        successUrl: "/billing/success",
        failUrl: "/billing/checkout",
        metadata: {
          paymentId: payment.id,
          couponCode: calc.coupon?.code ?? null,
        },
      });

      return {
        mode: "payment_required" as const,
        orderId,
        paymentId: payment.id,
        subscriptionId: null,
        status: BillingPaymentStatus.READY,
        finalAmount: calc.finalAmount,
        freeMonths: 0,
        trialEndAt: null,
        currentPeriodEnd: null,
        plan: { id: plan.id, code: plan.code, name: plan.name },
        coupon: calc.coupon,
        pgReady: pg.pgReady,
        providerMessage: pg.message ?? null,
      };
    });
  },

  async getMySubscription(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer", "admin"]);
    return billingSubscriptionRepository.findLatestByUserId(actor.userId);
  },

  async getMyPayments(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer", "admin"]);
    return billingPaymentRepository.listByUserId(actor.userId);
  },

  // --- Admin ---

  async adminListPlans(actor: ActorContext) {
    requireRole(actor, ["admin"]);
    return billingPlanRepository.listAll();
  },

  async adminUpdatePlan(
    actor: ActorContext,
    planId: string,
    data: { name?: string; price?: number; isActive?: boolean; sortOrder?: number },
  ) {
    requireRole(actor, ["admin"]);
    if (data.price != null && (!Number.isInteger(data.price) || data.price < 0)) {
      throw new AppError("VALIDATION_ERROR", "가격은 0 이상의 정수여야 합니다.");
    }
    return billingPlanRepository.update(planId, data);
  },

  async adminListCoupons(actor: ActorContext) {
    requireRole(actor, ["admin"]);
    return billingCouponRepository.listAll();
  },

  async adminCreateCoupon(
    actor: ActorContext,
    input: {
      code: string;
      name: string;
      description?: string | null;
      type: BillingCouponType;
      freeMonths?: number | null;
      percentOff?: number | null;
      fixedAmountOff?: number | null;
      startsAt?: Date | null;
      expiresAt?: Date | null;
      maxRedemptions?: number | null;
      perUserLimit?: number;
      applicablePlan?: BillingCouponApplicablePlan;
      isActive?: boolean;
    },
  ) {
    requireRole(actor, ["admin"]);
    const code = normalizeCouponCode(input.code);
    if (!code) {
      throw new AppError("VALIDATION_ERROR", "쿠폰 코드를 입력하세요.");
    }
    const existing = await billingCouponRepository.findByNormalizedCode(code);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", "이미 존재하는 쿠폰 코드입니다.");
    }

    if (input.type === BillingCouponType.FREE_MONTHS) {
      const m = Number(input.freeMonths ?? 0);
      if (!Number.isInteger(m) || m < 1 || m > 36) {
        throw new AppError(
          "VALIDATION_ERROR",
          "무료 개월 수는 1~36이어야 합니다.",
        );
      }
    }
    if (input.type === BillingCouponType.PERCENT) {
      const p = Number(input.percentOff ?? 0);
      if (!Number.isInteger(p) || p <= 0 || p > 100) {
        throw new AppError(
          "VALIDATION_ERROR",
          "할인율은 1~100이어야 합니다.",
        );
      }
    }
    if (input.type === BillingCouponType.FIXED_AMOUNT) {
      const a = Number(input.fixedAmountOff ?? 0);
      if (!Number.isInteger(a) || a <= 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "정액 할인 금액은 1원 이상이어야 합니다.",
        );
      }
    }

    return billingCouponRepository.create({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      freeMonths:
        input.type === BillingCouponType.FREE_MONTHS
          ? Number(input.freeMonths)
          : null,
      percentOff:
        input.type === BillingCouponType.PERCENT
          ? Number(input.percentOff)
          : null,
      fixedAmountOff:
        input.type === BillingCouponType.FIXED_AMOUNT
          ? Number(input.fixedAmountOff)
          : null,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      perUserLimit: input.perUserLimit ?? 1,
      applicablePlan: input.applicablePlan ?? BillingCouponApplicablePlan.ALL,
      isActive: input.isActive ?? true,
      createdByUser: { connect: { id: actor.userId } },
    });
  },

  async adminSetCouponActive(
    actor: ActorContext,
    couponId: string,
    isActive: boolean,
  ) {
    requireRole(actor, ["admin"]);
    return billingCouponRepository.update(couponId, { isActive });
  },

  async adminListSubscriptions(
    actor: ActorContext,
    filters: { status?: string; q?: string },
  ) {
    requireRole(actor, ["admin"]);
    return billingSubscriptionRepository.listForAdmin(filters);
  },

  async adminListPayments(actor: ActorContext, filters: { q?: string }) {
    requireRole(actor, ["admin"]);
    return billingPaymentRepository.listForAdmin(filters);
  },
};
