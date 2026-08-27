import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  isBillingEnforceAccessEnabled,
  roleRequiresBilling,
} from "@/lib/billing/billing-flags";
import { isEntitledSubscription } from "@/lib/billing/checkout-calculator";
import { billingSubscriptionRepository } from "@/lib/repositories/billing.repository";

export type BillingEntitlementResult = {
  entitled: boolean;
  reason:
    | "admin_bypass"
    | "role_exempt"
    | "enforce_disabled"
    | "active"
    | "trial"
    | "cancelled_period"
    | "missing"
    | "expired"
    | "pending"
    | "other";
  subscriptionId: string | null;
  status: string | null;
  redirectToCheckout: boolean;
};

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
    };
  }

  if (!roleRequiresBilling(actor.role)) {
    return {
      entitled: true,
      reason: "role_exempt",
      subscriptionId: null,
      status: null,
      redirectToCheckout: false,
    };
  }

  const sub = await billingSubscriptionRepository.findLatestByUserId(
    actor.userId,
  );

  if (!isBillingEnforceAccessEnabled()) {
    return {
      entitled: true,
      reason: "enforce_disabled",
      subscriptionId: sub?.id ?? null,
      status: sub?.status ?? null,
      redirectToCheckout: false,
    };
  }

  if (!sub) {
    return {
      entitled: false,
      reason: "missing",
      subscriptionId: null,
      status: null,
      redirectToCheckout: true,
    };
  }

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
    };
  }

  return {
    entitled: false,
    reason:
      sub.status === "PENDING"
        ? "pending"
        : sub.status === "EXPIRED" || sub.status === "TRIAL"
          ? "expired"
          : "other",
    subscriptionId: sub.id,
    status: sub.status,
    redirectToCheckout: true,
  };
}

export async function hasActiveBillingEntitlement(
  actor: Pick<ActorContext, "userId" | "role">,
): Promise<boolean> {
  const result = await evaluateBillingEntitlement(actor);
  return result.entitled;
}

/** Post-login / layout: return checkout path when blocked. */
export async function billingCheckoutRedirectPath(
  actor: Pick<ActorContext, "userId" | "role">,
): Promise<string | null> {
  const result = await evaluateBillingEntitlement(actor);
  return result.redirectToCheckout ? "/billing/checkout" : null;
}
