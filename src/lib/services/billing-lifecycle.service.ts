import "server-only";

import { randomUUID } from "crypto";
import {
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
  periodEndForInterval,
  type CheckoutCouponInput,
  type CheckoutPlanInput,
} from "@/lib/billing/checkout-calculator";
import {
  isBillingRequirePaymentMethodForTrial,
} from "@/lib/billing/billing-flags";
import { isBillingBusinessEnforcementActive } from "@/lib/billing/billing-provider-config";
import {
  actorCanAccessPayment,
  ensureOrgTossCustomerKey,
  mapProviderEnvironment,
  orgOwnerConnect,
  paymentMethodDefaultWhere,
  requireBillingOrgOwner,
  resolveBillingOrgOwner,
} from "@/lib/billing/org-billing-owner";
import {
  TossBillingApiError,
  tossBillingApi,
} from "@/lib/billing/toss-billing-api";
import { getTossBillingEnv } from "@/lib/billing/toss-env";
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

function mapCouponError(e: unknown): never {
  if (e instanceof CheckoutCouponError) {
    throw new AppError("VALIDATION_ERROR", e.message, {
      couponError: e.errorCode,
    });
  }
  throw e;
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

function toCouponInput(c: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: CheckoutCouponInput["type"];
  freeMonths: number | null;
  percentOff: number | null;
  fixedAmountOff: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number;
  applicablePlan: CheckoutCouponInput["applicablePlan"];
  isActive: boolean;
}): CheckoutCouponInput {
  return { ...c };
}

async function loadCheckoutCalc(
  userId: string,
  planId: string,
  couponCode: string | null | undefined,
  tx: Prisma.TransactionClient,
) {
  const plan = await billingPlanRepository.findById(planId, tx);
  if (!plan || !plan.isActive) {
    throw new AppError("NOT_FOUND", "요금제를 찾을 수 없습니다.");
  }
  const code = normalizeCouponCode(couponCode);
  let couponRow = null as Awaited<
    ReturnType<typeof billingCouponRepository.findByNormalizedCode>
  >;
  let userRedemptionCount = 0;
  if (code) {
    couponRow = await billingCouponRepository.findByNormalizedCode(code, tx);
    if (!couponRow) {
      throw new AppError("VALIDATION_ERROR", "존재하지 않는 쿠폰입니다.");
    }
    const locked = await billingCouponRepository.lockById(couponRow.id, tx);
    if (!locked) {
      throw new AppError("VALIDATION_ERROR", "존재하지 않는 쿠폰입니다.");
    }
    couponRow = locked;
    userRedemptionCount =
      await billingCouponRedemptionRepository.countByUserAndCoupon(
        userId,
        couponRow.id,
        tx,
      );
  }
  try {
    const calc = calculateCheckout({
      plan: toPlanInput(plan),
      coupon: couponRow
        ? toCouponInput({
            ...couponRow,
            type: couponRow.type as CheckoutCouponInput["type"],
            applicablePlan:
              couponRow.applicablePlan as CheckoutCouponInput["applicablePlan"],
          })
        : null,
      couponCode: code || null,
      userRedemptionCount,
    });
    return { plan, calc, couponRow };
  } catch (e) {
    mapCouponError(e);
  }
}

function generateOrderId(): string {
  return `bill_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function resolveActorSubscription(
  actor: ActorContext,
  tx?: Prisma.TransactionClient,
) {
  const org = await resolveBillingOrgOwner(actor, tx);
  return billingSubscriptionRepository.findLatestForOrgOrUser(
    {
      gymId: org?.gymId ?? null,
      organizerId: org?.organizerId ?? null,
      userId: actor.userId,
    },
    tx,
  );
}

export const billingLifecycleService = {
  async getOrCreateCustomerKey(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer"]);
    return prisma.$transaction(async (tx) => {
      const org = await requireBillingOrgOwner(actor, tx);
      return ensureOrgTossCustomerKey(org, tx);
    });
  },

  /**
   * Prepare paid (or trial-with-PM) checkout: READY payment + customerKey for Toss Billing Auth.
   */
  async prepareTossCheckout(input: {
    actor: ActorContext;
    planId: string;
    couponCode?: string | null;
  }) {
    requireRole(input.actor, ["gym", "organizer"]);
    if (!(await isBillingBusinessEnforcementActive())) {
      throw new AppError(
        "VALIDATION_ERROR",
        "현재 이용권 결제가 준비 중입니다. 관리자에게 문의해주세요.",
      );
    }
    const env = await getTossBillingEnv();

    return prisma.$transaction(async (tx) => {
      const org = await requireBillingOrgOwner(input.actor, tx);
      const orgConnect = orgOwnerConnect(org);
      const providerEnvironment = mapProviderEnvironment(env.isTestKey);

      const { plan, calc, couponRow } = await loadCheckoutCalc(
        input.actor.userId,
        input.planId,
        input.couponCode,
        tx,
      );

      const requirePm =
        calc.finalAmount > 0 ||
        (calc.freeMonths > 0 && isBillingRequirePaymentMethodForTrial());

      if (calc.finalAmount === 0 && !requirePm) {
        throw new AppError(
          "VALIDATION_ERROR",
          "무료 이용은 카드 등록 없이 바로 시작할 수 있습니다.",
        );
      }

      if (!env.pgReady) {
        throw new AppError(
          "VALIDATION_ERROR",
          "현재 온라인 결제 준비 중입니다. 관리자에게 문의해주세요.",
        );
      }

      const customerKey = await ensureOrgTossCustomerKey(org, tx);
      const orderId = generateOrderId();

      const payment = await billingPaymentRepository.create(
        {
          user: { connect: { id: org.ownerUserId } },
          actorUser: { connect: { id: input.actor.userId } },
          ...orgConnect,
          plan: { connect: { id: plan.id } },
          orderId,
          amount: calc.finalAmount,
          originalAmount: calc.originalAmount,
          discountAmount: calc.discountAmount,
          status: BillingPaymentStatus.READY,
          provider: "toss",
          providerEnvironment,
          metadata: {
            planId: plan.id,
            couponCode: calc.coupon?.code ?? null,
            couponId: couponRow?.id ?? null,
            freeMonths: calc.freeMonths,
            customerKey,
            purpose: calc.finalAmount === 0 ? "trial_pm" : "initial_charge",
            orgKind: org.kind,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      return {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: calc.finalAmount,
        customerKey,
        clientKey: env.clientKey!,
        isTestKey: env.isTestKey,
        plan: { id: plan.id, code: plan.code, name: plan.name },
        coupon: calc.coupon,
        freeMonths: calc.freeMonths,
        trialEndAt: calc.trialEndAt?.toISOString() ?? null,
      };
    });
  },

  /**
   * Toss success callback: issue billingKey → charge if needed → activate subscription.
   * Idempotent on orderId. Org owner is SSOT; actor is authorized payer.
   */
  async completeTossBillingAuth(input: {
    actor: ActorContext;
    orderId: string;
    authKey: string;
    customerKey: string;
  }) {
    requireRole(input.actor, ["gym", "organizer"]);
    if (!(await isBillingBusinessEnforcementActive())) {
      throw new AppError(
        "VALIDATION_ERROR",
        "현재 이용권 결제가 준비 중입니다. 관리자에게 문의해주세요.",
      );
    }

    return prisma.$transaction(async (tx) => {
      const org = await requireBillingOrgOwner(input.actor, tx);
      const orgConnect = orgOwnerConnect(org);
      const env = await getTossBillingEnv();
      const providerEnvironment = mapProviderEnvironment(env.isTestKey);

      const payment = await billingPaymentRepository.findByOrderId(
        input.orderId,
        tx,
      );
      if (
        !payment ||
        !actorCanAccessPayment(input.actor, payment, org)
      ) {
        throw new AppError("NOT_FOUND", "결제 주문을 찾을 수 없습니다.");
      }

      if (payment.status === BillingPaymentStatus.PAID) {
        const sub = payment.subscriptionId
          ? await tx.billingSubscription.findUnique({
              where: { id: payment.subscriptionId },
            })
          : null;
        return {
          mode: "already_paid" as const,
          orderId: payment.orderId,
          subscriptionId: sub?.id ?? null,
          status: sub?.status ?? "ACTIVE",
          finalAmount: payment.amount,
          freeMonths: 0,
          trialEndAt: sub?.trialEndAt?.toISOString() ?? null,
          currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
          plan: {
            id: payment.planId,
            code: payment.plan.code,
            name: payment.plan.name,
          },
        };
      }

      if (payment.status !== BillingPaymentStatus.READY) {
        throw new AppError(
          "VALIDATION_ERROR",
          "처리할 수 없는 결제 상태입니다.",
        );
      }

      if (
        payment.providerEnvironment &&
        payment.providerEnvironment !== providerEnvironment
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "결제 환경(TEST/LIVE)이 일치하지 않습니다. 결제수단을 다시 등록해주세요.",
        );
      }

      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      const expectedCustomerKey = String(meta.customerKey ?? "");
      if (
        expectedCustomerKey &&
        expectedCustomerKey !== input.customerKey
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "customerKey가 일치하지 않습니다.",
        );
      }

      const orgKey = await ensureOrgTossCustomerKey(org, tx);
      if (orgKey !== input.customerKey) {
        throw new AppError(
          "VALIDATION_ERROR",
          "등록된 customerKey와 일치하지 않습니다.",
        );
      }

      const couponCode =
        typeof meta.couponCode === "string" ? meta.couponCode : null;
      const { plan, calc, couponRow } = await loadCheckoutCalc(
        input.actor.userId,
        payment.planId,
        couponCode,
        tx,
      );

      // Server SSOT amount — never trust client amount
      if (calc.finalAmount !== payment.amount) {
        await billingPaymentRepository.update(
          payment.id,
          {
            amount: calc.finalAmount,
            originalAmount: calc.originalAmount,
            discountAmount: calc.discountAmount,
          },
          tx,
        );
      }

      let issued;
      try {
        issued = await tossBillingApi.issueBillingKey({
          authKey: input.authKey,
          customerKey: input.customerKey,
        });
      } catch (e) {
        const code =
          e instanceof TossBillingApiError ? e.code : "TOSS_ISSUE_FAILED";
        const message =
          e instanceof Error ? e.message : "빌링키 발급에 실패했습니다.";
        await billingPaymentRepository.update(
          payment.id,
          {
            status: BillingPaymentStatus.FAILED,
            failedAt: new Date(),
            failureCode: code,
            failureMessage: message,
          },
          tx,
        );
        throw new AppError("VALIDATION_ERROR", message);
      }

      await tx.billingPaymentMethod.updateMany({
        where: paymentMethodDefaultWhere(org, org.ownerUserId),
        data: { isDefault: false },
      });

      const method = await tx.billingPaymentMethod.create({
        data: {
          userId: org.ownerUserId,
          gymId: org.kind === "gym" ? org.gymId : null,
          organizerId: org.kind === "organizer" ? org.organizerId : null,
          provider: "toss",
          providerEnvironment,
          customerKey: issued.customerKey,
          billingKey: issued.billingKey,
          cardCompany: issued.cardCompany,
          cardLast4: issued.cardLast4,
          isDefault: true,
        },
      });

      const now = new Date();
      const isTrial = calc.finalAmount === 0 && calc.freeMonths > 0;
      let providerPaymentId: string | null = null;

      if (calc.finalAmount > 0) {
        try {
          const charged = await tossBillingApi.charge({
            billingKey: issued.billingKey,
            customerKey: issued.customerKey,
            amount: calc.finalAmount,
            orderId: payment.orderId,
            orderName: plan.name,
            idempotencyKey: payment.orderId,
          });
          providerPaymentId = charged.paymentKey;
          if (charged.amount !== calc.finalAmount) {
            throw new AppError(
              "VALIDATION_ERROR",
              "결제 금액이 일치하지 않습니다.",
            );
          }
        } catch (e) {
          const code =
            e instanceof TossBillingApiError ? e.code : "TOSS_CHARGE_FAILED";
          const message =
            e instanceof Error ? e.message : "결제에 실패했습니다.";
          await billingPaymentRepository.update(
            payment.id,
            {
              status: BillingPaymentStatus.FAILED,
              failedAt: new Date(),
              failureCode: code,
              failureMessage: message,
            },
            tx,
          );
          throw new AppError("VALIDATION_ERROR", message);
        }
      }

      const periodEnd = isTrial
        ? calc.trialEndAt!
        : periodEndForInterval(
            plan.interval === BillingPlanInterval.YEAR ? "YEAR" : "MONTH",
            now,
          );

      const subscription = await billingSubscriptionRepository.create(
        {
          user: { connect: { id: org.ownerUserId } },
          ...orgConnect,
          plan: { connect: { id: plan.id } },
          status: isTrial
            ? BillingSubscriptionStatus.TRIAL
            : BillingSubscriptionStatus.ACTIVE,
          billingInterval: plan.interval,
          basePrice: calc.originalAmount,
          currentPrice: isTrial ? calc.originalAmount : calc.finalAmount,
          startedAt: now,
          trialStartedAt: isTrial ? now : null,
          trialEndAt: isTrial ? calc.trialEndAt : null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingAt: periodEnd,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          paymentMethod: { connect: { id: method.id } },
          provider: "toss",
          providerEnvironment,
          providerCustomerId: issued.customerKey,
        },
        tx,
      );

      await billingPaymentRepository.update(
        payment.id,
        {
          status: BillingPaymentStatus.PAID,
          amount: calc.finalAmount,
          originalAmount: calc.originalAmount,
          discountAmount: calc.discountAmount,
          paidAt: now,
          paymentMethod: "card",
          providerPaymentId,
          providerEnvironment,
          subscription: { connect: { id: subscription.id } },
          metadata: {
            ...meta,
            cardLast4: issued.cardLast4,
            cardCompany: issued.cardCompany,
            billingKeyMasked: tossBillingApi.maskBillingKey(issued.billingKey),
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      if (couponRow && calc.coupon) {
        const existing =
          await billingCouponRedemptionRepository.countByUserAndCoupon(
            input.actor.userId,
            couponRow.id,
            tx,
          );
        if (existing === 0) {
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
      }

      return {
        mode: "activated" as const,
        orderId: payment.orderId,
        subscriptionId: subscription.id,
        status: subscription.status,
        finalAmount: calc.finalAmount,
        freeMonths: calc.freeMonths,
        trialEndAt: subscription.trialEndAt?.toISOString() ?? null,
        currentPeriodEnd: periodEnd.toISOString(),
        plan: { id: plan.id, code: plan.code, name: plan.name },
        coupon: calc.coupon,
      };
    });
  },

  async cancelAtPeriodEnd(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer"]);
    const sub = await resolveActorSubscription(actor);
    if (!sub || !["ACTIVE", "TRIAL"].includes(sub.status)) {
      throw new AppError("VALIDATION_ERROR", "해지할 구독이 없습니다.");
    }
    return billingSubscriptionRepository.update(sub.id, {
      cancelAtPeriodEnd: true,
      autoRenew: false,
      cancelledAt: new Date(),
    });
  },

  async resumeAutoRenew(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer"]);
    const sub = await resolveActorSubscription(actor);
    if (!sub || sub.status === "EXPIRED" || sub.status === "CANCELLED") {
      throw new AppError("VALIDATION_ERROR", "재개할 구독이 없습니다.");
    }
    return billingSubscriptionRepository.update(sub.id, {
      cancelAtPeriodEnd: false,
      autoRenew: true,
      cancelledAt: null,
    });
  },

  /**
   * Replace default payment method via new Toss billing auth order (amount 0 intent).
   */
  async preparePaymentMethodChange(actor: ActorContext) {
    requireRole(actor, ["gym", "organizer"]);
    if (!(await isBillingBusinessEnforcementActive())) {
      throw new AppError(
        "VALIDATION_ERROR",
        "현재 이용권 결제가 준비 중입니다. 관리자에게 문의해주세요.",
      );
    }
    const env = await getTossBillingEnv();
    if (!env.pgReady || !env.clientKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "현재 온라인 결제 준비 중입니다. 관리자에게 문의해주세요.",
      );
    }
    const plans = await billingPlanRepository.listActive();
    const plan = plans[0];
    if (!plan) {
      throw new AppError("NOT_FOUND", "요금제가 없습니다.");
    }

    return prisma.$transaction(async (tx) => {
      const org = await requireBillingOrgOwner(actor, tx);
      const orgConnect = orgOwnerConnect(org);
      const providerEnvironment = mapProviderEnvironment(env.isTestKey);
      const customerKey = await ensureOrgTossCustomerKey(org, tx);
      const orderId = generateOrderId();
      await billingPaymentRepository.create(
        {
          user: { connect: { id: org.ownerUserId } },
          actorUser: { connect: { id: actor.userId } },
          ...orgConnect,
          plan: { connect: { id: plan.id } },
          orderId,
          amount: 0,
          originalAmount: 0,
          discountAmount: 0,
          status: BillingPaymentStatus.READY,
          provider: "toss",
          providerEnvironment,
          metadata: {
            purpose: "replace_payment_method",
            customerKey,
            orgKind: org.kind,
          } as Prisma.InputJsonValue,
        },
        tx,
      );
      return {
        orderId,
        customerKey,
        clientKey: env.clientKey!,
        isTestKey: env.isTestKey,
        amount: 0,
      };
    });
  },

  async completePaymentMethodChange(input: {
    actor: ActorContext;
    orderId: string;
    authKey: string;
    customerKey: string;
  }) {
    requireRole(input.actor, ["gym", "organizer"]);
    return prisma.$transaction(async (tx) => {
      const org = await requireBillingOrgOwner(input.actor, tx);
      const env = await getTossBillingEnv();
      const providerEnvironment = mapProviderEnvironment(env.isTestKey);

      const payment = await billingPaymentRepository.findByOrderId(
        input.orderId,
        tx,
      );
      if (
        !payment ||
        !actorCanAccessPayment(input.actor, payment, org)
      ) {
        throw new AppError("NOT_FOUND", "주문을 찾을 수 없습니다.");
      }
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      if (meta.purpose !== "replace_payment_method") {
        throw new AppError("VALIDATION_ERROR", "결제수단 변경 주문이 아닙니다.");
      }
      if (payment.status === BillingPaymentStatus.PAID) {
        return { ok: true as const, already: true };
      }

      const orgKey = await ensureOrgTossCustomerKey(org, tx);
      if (orgKey !== input.customerKey) {
        throw new AppError("VALIDATION_ERROR", "customerKey 불일치");
      }

      const issued = await tossBillingApi.issueBillingKey({
        authKey: input.authKey,
        customerKey: input.customerKey,
      });

      const oldDefaults = await tx.billingPaymentMethod.findMany({
        where: paymentMethodDefaultWhere(org, org.ownerUserId),
      });

      const method = await tx.billingPaymentMethod.create({
        data: {
          userId: org.ownerUserId,
          gymId: org.kind === "gym" ? org.gymId : null,
          organizerId: org.kind === "organizer" ? org.organizerId : null,
          provider: "toss",
          providerEnvironment,
          customerKey: issued.customerKey,
          billingKey: issued.billingKey,
          cardCompany: issued.cardCompany,
          cardLast4: issued.cardLast4,
          isDefault: true,
        },
      });

      for (const old of oldDefaults) {
        await tx.billingPaymentMethod.update({
          where: { id: old.id },
          data: { isDefault: false, deletedAt: new Date() },
        });
        await tossBillingApi.deleteBillingKey(old.billingKey);
      }

      const sub = await resolveActorSubscription(input.actor, tx);
      if (sub) {
        await billingSubscriptionRepository.update(
          sub.id,
          { paymentMethod: { connect: { id: method.id } } },
          tx,
        );
      }

      await billingPaymentRepository.update(
        payment.id,
        {
          status: BillingPaymentStatus.PAID,
          paidAt: new Date(),
          paymentMethod: "card",
          providerEnvironment,
          metadata: {
            ...meta,
            cardLast4: issued.cardLast4,
            billingKeyMasked: tossBillingApi.maskBillingKey(issued.billingKey),
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      return { ok: true as const, already: false };
    });
  },
};
