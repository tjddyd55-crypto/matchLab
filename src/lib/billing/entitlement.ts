import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  isBillingEnforceAccessEnabled,
  roleRequiresBilling,
} from "@/lib/billing/billing-flags";
import { isBillingBusinessEnforcementActive } from "@/lib/billing/billing-provider-config";
import { isEntitledSubscription } from "@/lib/billing/checkout-calculator";
import { prisma } from "@/lib/prisma";
import { billingSubscriptionRepository } from "@/lib/repositories/billing.repository";

export type BillingEntitlementResult = {
  entitled: boolean;
  reason:
    | "admin_bypass"
    | "role_exempt"
    | "billing_exempt"
    | "legacy_not_required"
    | "active"
    | "trial"
    | "cancelled_period"
    | "missing"
    | "expired"
    | "pending"
    | "past_due"
    | "enforce"
    | "billing_disabled"
    | "other";
  subscriptionId: string | null;
  status: string | null;
  redirectToCheckout: boolean;
  billingRequired: boolean;
};

/**
 * Per-user billing requirement (Phase 2) takes priority over global ENFORCE.
 *
 * - admin / fighter / gym_staff: exempt
 * - billingExempt: exempt
 * - entitled ACTIVE/TRIAL/CANCELLED(period): ok
 * - billingRequiredAt set + enforcement active + not entitled → checkout
 * - billingRequiredAt set + enforcement disabled → service access ok (billing_disabled)
 * - billingRequiredAt null (legacy grandfather): ok unless emergency ENFORCE + enforcement active
 */
export async function evaluateBillingEntitlement(
  actor: Pick<ActorContext, "userId" | "role">,
  now = new Date(),
): Promise<BillingEntitlementResult> {
  if (actor.role === "admin") {
    return {
      entitled: true,
      reason: "admin_bypass",
      subscriptionId: null,
      status: null,
      redirectToCheckout: false,
      billingRequired: false,
    };
  }

  if (!roleRequiresBilling(actor.role)) {
    return {
      entitled: true,
      reason: "role_exempt",
      subscriptionId: null,
      status: null,
      redirectToCheckout: false,
      billingRequired: false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: {
      billingRequiredAt: true,
      billingExempt: true,
    },
  });

  if (user?.billingExempt) {
    return {
      entitled: true,
      reason: "billing_exempt",
      subscriptionId: null,
      status: null,
      redirectToCheckout: false,
      billingRequired: false,
    };
  }

  const sub = await billingSubscriptionRepository.findLatestByUserId(
    actor.userId,
  );

  if (sub) {
    const entitled = isEntitledSubscription({
      status: sub.status,
      trialEndAt: sub.trialEndAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      now,
    });
    if (entitled) {
      const reason =
        sub.status === "TRIAL"
          ? "trial"
          : sub.status === "CANCELLED"
            ? "cancelled_period"
            : "active";
      return {
        entitled: true,
        reason,
        subscriptionId: sub.id,
        status: sub.status,
        redirectToCheckout: false,
        billingRequired: Boolean(user?.billingRequiredAt),
      };
    }
  }

  const billingRequired = Boolean(user?.billingRequiredAt);
  const enforcementActive = await isBillingBusinessEnforcementActive();

  if (billingRequired && enforcementActive) {
    return {
      entitled: false,
      reason: !sub
        ? "missing"
        : sub.status === "PENDING"
          ? "pending"
          : sub.status === "PAST_DUE"
            ? "past_due"
            : sub.status === "EXPIRED" || sub.status === "TRIAL"
              ? "expired"
              : "other",
      subscriptionId: sub?.id ?? null,
      status: sub?.status ?? null,
      redirectToCheckout: true,
      billingRequired: true,
    };
  }

  // Legacy / pre-Phase2 accounts without billingRequiredAt
  if (isBillingEnforceAccessEnabled() && enforcementActive) {
    return {
      entitled: false,
      reason: "enforce",
      subscriptionId: sub?.id ?? null,
      status: sub?.status ?? null,
      redirectToCheckout: true,
      billingRequired: true,
    };
  }

  return {
    entitled: true,
    reason: billingRequired ? "billing_disabled" : "legacy_not_required",
    subscriptionId: sub?.id ?? null,
    status: sub?.status ?? null,
    redirectToCheckout: false,
    billingRequired,
  };
}

export async function hasActiveBillingEntitlement(
  actor: Pick<ActorContext, "userId" | "role">,
): Promise<boolean> {
  const result = await evaluateBillingEntitlement(actor);
  return result.entitled;
}

export async function billingCheckoutRedirectPath(
  actor: Pick<ActorContext, "userId" | "role">,
): Promise<string | null> {
  const result = await evaluateBillingEntitlement(actor);
  return result.redirectToCheckout ? "/billing/checkout" : null;
}

/** Call from gym/association approval when creating a billable User. */
export async function markUserBillingRequired(
  userId: string,
  at: Date = new Date(),
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { billingRequiredAt: at },
  });
}
