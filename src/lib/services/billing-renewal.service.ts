import "server-only";

import {
  BillingPaymentStatus,
  BillingSubscriptionStatus,
  type Prisma,
} from "@/generated/prisma";
import {
  periodEndForInterval,
} from "@/lib/billing/checkout-calculator";
import {
  TossBillingApiError,
  tossBillingApi,
} from "@/lib/billing/toss-billing-api";
import { prisma } from "@/lib/prisma";
import {
  billingPaymentRepository,
  billingSubscriptionRepository,
} from "@/lib/repositories/billing.repository";

/**
 * Stable renewal orderId — subscriptionId + period start date (UTC date).
 * No random suffix: duplicate triggers must hit the same row.
 */
export function renewalOrderId(
  subscriptionId: string,
  periodStart: Date,
): string {
  return `renew_${subscriptionId}_${periodStart.toISOString().slice(0, 10)}`;
}

/**
 * Process due renewals. Idempotent per (subscriptionId, period key via orderId).
 */
export async function runBillingRenewals(limit = 50): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();
  const due = await billingSubscriptionRepository.findDueForRenewal(now, limit);
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const sub of due) {
    const result = await processOneRenewal(sub.id);
    if (result === "ok") succeeded += 1;
    else if (result === "fail") failed += 1;
    else skipped += 1;
  }

  return {
    processed: due.length,
    succeeded,
    failed,
    skipped,
  };
}

/** TEST/DEV-safe: renew a single subscription by id (no production UI). */
export async function runSubscriptionBilling(
  subscriptionId: string,
): Promise<"ok" | "fail" | "skip"> {
  return processOneRenewal(subscriptionId);
}

async function processOneRenewal(
  subscriptionId: string,
): Promise<"ok" | "fail" | "skip"> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "BillingSubscription" WHERE id = $1 FOR UPDATE`,
      subscriptionId,
    );
    if (!rows[0]) return "skip";

    const sub = await tx.billingSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        paymentMethod: true,
        user: { select: { id: true, tossCustomerKey: true } },
        gym: { select: { id: true, tossCustomerKey: true } },
        organizer: { select: { id: true, tossCustomerKey: true } },
      },
    });
    if (!sub) return "skip";
    if (!sub.autoRenew || sub.cancelAtPeriodEnd) return "skip";
    if (!sub.nextBillingAt || sub.nextBillingAt > new Date()) return "skip";
    if (!sub.paymentMethod || sub.paymentMethod.deletedAt) return "skip";
    if (!["ACTIVE", "TRIAL"].includes(sub.status)) return "skip";

    // Environment isolation: do not charge LIVE method under TEST runtime (and vice versa)
    if (
      sub.paymentMethod.providerEnvironment &&
      sub.providerEnvironment &&
      sub.paymentMethod.providerEnvironment !== sub.providerEnvironment
    ) {
      return "skip";
    }

    const amount = sub.currentPrice;
    const orderId = renewalOrderId(sub.id, sub.nextBillingAt);

    const existing = await tx.billingPayment.findUnique({
      where: { orderId },
    });
    if (existing?.status === BillingPaymentStatus.PAID) {
      return "skip";
    }

    const payment = existing
      ? existing
      : await billingPaymentRepository.create(
          {
            user: { connect: { id: sub.userId } },
            ...(sub.gymId ? { gym: { connect: { id: sub.gymId } } } : {}),
            ...(sub.organizerId
              ? { organizer: { connect: { id: sub.organizerId } } }
              : {}),
            subscription: { connect: { id: sub.id } },
            plan: { connect: { id: sub.planId } },
            orderId,
            amount,
            originalAmount: sub.basePrice,
            discountAmount: Math.max(0, sub.basePrice - amount),
            status: BillingPaymentStatus.READY,
            provider: "toss",
            providerEnvironment: sub.providerEnvironment ?? undefined,
            metadata: {
              purpose: "renewal",
              subscriptionId: sub.id,
              periodStart: sub.nextBillingAt.toISOString(),
            } as Prisma.InputJsonValue,
          },
          tx,
        );

    if (payment.status === BillingPaymentStatus.FAILED) {
      await billingPaymentRepository.update(
        payment.id,
        {
          status: BillingPaymentStatus.READY,
          failedAt: null,
          failureCode: null,
          failureMessage: null,
        },
        tx,
      );
    }

    const customerKey =
      sub.gym?.tossCustomerKey ||
      sub.organizer?.tossCustomerKey ||
      sub.paymentMethod.customerKey ||
      sub.user.tossCustomerKey;

    if (!customerKey) {
      await billingPaymentRepository.update(
        payment.id,
        {
          status: BillingPaymentStatus.FAILED,
          failedAt: new Date(),
          failureCode: "MISSING_CUSTOMER_KEY",
          failureMessage: "customerKey가 없습니다.",
        },
        tx,
      );
      await billingSubscriptionRepository.update(
        sub.id,
        { status: BillingSubscriptionStatus.PAST_DUE },
        tx,
      );
      return "fail";
    }

    try {
      const charged = await tossBillingApi.charge({
        billingKey: sub.paymentMethod.billingKey,
        customerKey,
        amount,
        orderId: payment.orderId,
        orderName: `${sub.plan.name} 갱신`,
        idempotencyKey: payment.orderId,
      });

      const periodStart = sub.nextBillingAt;
      const periodEnd = periodEndForInterval(
        sub.billingInterval === "YEAR" ? "YEAR" : "MONTH",
        periodStart,
      );

      await billingPaymentRepository.update(
        payment.id,
        {
          status: BillingPaymentStatus.PAID,
          paidAt: new Date(),
          providerPaymentId: charged.paymentKey,
          paymentMethod: charged.method ?? "card",
        },
        tx,
      );

      await billingSubscriptionRepository.update(
        sub.id,
        {
          status: BillingSubscriptionStatus.ACTIVE,
          trialEndAt: null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          nextBillingAt: periodEnd,
        },
        tx,
      );

      return "ok";
    } catch (e) {
      const code =
        e instanceof TossBillingApiError ? e.code : "RENEWAL_FAILED";
      const message = e instanceof Error ? e.message : "갱신 결제 실패";
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
      await billingSubscriptionRepository.update(
        sub.id,
        { status: BillingSubscriptionStatus.PAST_DUE },
        tx,
      );
      return "fail";
    }
  });
}

/** Close subscriptions that reached period end with cancelAtPeriodEnd. */
export async function expireCancelledSubscriptions(now = new Date()) {
  const rows = await prisma.billingSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lte: now },
      status: { in: ["ACTIVE", "TRIAL", "CANCELLED"] },
    },
    take: 100,
  });
  for (const sub of rows) {
    await billingSubscriptionRepository.update(sub.id, {
      status: BillingSubscriptionStatus.EXPIRED,
      endedAt: now,
      autoRenew: false,
      nextBillingAt: null,
    });
  }
  return rows.length;
}
