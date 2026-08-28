/**
 * Static + pure calculator verify for platform billing.
 *   npm run verify:billing-checkout
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculateCheckout,
  CheckoutCouponError,
  isEntitledSubscription,
  normalizeCouponCode,
  yearlySavingsLabel,
} from "../src/lib/billing/checkout-calculator";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const planMonthly = {
  id: "p1",
  code: "MONTHLY",
  name: "월간 이용권",
  interval: "MONTH" as const,
  price: 8800,
  isActive: true,
};

const planYearly = {
  ...planMonthly,
  id: "p2",
  code: "YEARLY",
  name: "연간 이용권",
  interval: "YEAR" as const,
  price: 88000,
};

function coupon(partial: Record<string, unknown>) {
  return {
    id: "c1",
    code: "TEST",
    name: "테스트",
    description: null,
    type: "FREE_MONTHS" as const,
    freeMonths: 3,
    percentOff: null,
    fixedAmountOff: null,
    startsAt: null,
    expiresAt: null,
    maxRedemptions: 100,
    redemptionCount: 0,
    perUserLimit: 1,
    applicablePlan: "ALL" as const,
    isActive: true,
    ...partial,
  };
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model BillingPlan/);
  assert.match(schema, /model BillingSubscription/);
  assert.match(schema, /model BillingPayment/);
  assert.match(schema, /model BillingCoupon/);
  assert.match(schema, /model BillingCouponRedemption/);
  assert.match(schema, /enum BillingCouponType/);

  const mig = read(
    "prisma/migrations/20260828080000_add_platform_billing/migration.sql",
  );
  assert.match(mig, /CREATE TABLE "BillingPlan"/);
  assert.doesNotMatch(mig, /DROP TABLE/i);

  assert.equal(normalizeCouponCode(" welcome3 "), "WELCOME3");

  // 1 monthly no coupon
  {
    const r = calculateCheckout({ plan: planMonthly });
    assert.equal(r.finalAmount, 8800);
    assert.equal(r.discountAmount, 0);
  }
  // 2 yearly no coupon
  {
    const r = calculateCheckout({ plan: planYearly });
    assert.equal(r.finalAmount, 88000);
  }
  // 3 free 3 months
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({ type: "FREE_MONTHS", freeMonths: 3, code: "WELCOME3" }),
      couponCode: "WELCOME3",
    });
    assert.equal(r.finalAmount, 0);
    assert.equal(r.freeMonths, 3);
    assert.ok(r.trialEndAt);
  }
  // 4 free 1 month
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({ freeMonths: 1, code: "F1" }),
      couponCode: "F1",
    });
    assert.equal(r.freeMonths, 1);
    assert.equal(r.finalAmount, 0);
  }
  // 5 50% 
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({
        type: "PERCENT",
        percentOff: 50,
        freeMonths: null,
        code: "OPEN50",
      }),
      couponCode: "OPEN50",
    });
    assert.equal(r.discountAmount, 4400);
    assert.equal(r.finalAmount, 4400);
  }
  // 6 fixed
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({
        type: "FIXED_AMOUNT",
        fixedAmountOff: 5000,
        freeMonths: null,
        code: "D5",
      }),
      couponCode: "D5",
    });
    assert.equal(r.finalAmount, 3800);
  }
  // 7 discount > price
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({
        type: "FIXED_AMOUNT",
        fixedAmountOff: 99999,
        freeMonths: null,
        code: "BIG",
      }),
      couponCode: "BIG",
    });
    assert.equal(r.finalAmount, 0);
  }
  // 8 expired
  assert.throws(
    () =>
      calculateCheckout({
        plan: planMonthly,
        coupon: coupon({
          expiresAt: new Date("2020-01-01"),
          code: "OLD",
        }),
        couponCode: "OLD",
      }),
    (e: unknown) =>
      e instanceof CheckoutCouponError && e.errorCode === "EXPIRED",
  );
  // 9 inactive
  assert.throws(
    () =>
      calculateCheckout({
        plan: planMonthly,
        coupon: coupon({ isActive: false, code: "OFF" }),
        couponCode: "OFF",
      }),
    (e: unknown) =>
      e instanceof CheckoutCouponError && e.errorCode === "INACTIVE",
  );
  // 10 exhausted
  assert.throws(
    () =>
      calculateCheckout({
        plan: planMonthly,
        coupon: coupon({
          maxRedemptions: 1,
          redemptionCount: 1,
          code: "OUT",
        }),
        couponCode: "OUT",
      }),
    (e: unknown) =>
      e instanceof CheckoutCouponError && e.errorCode === "EXHAUSTED",
  );
  // 11 user limit
  assert.throws(
    () =>
      calculateCheckout({
        plan: planMonthly,
        coupon: coupon({ code: "USED", perUserLimit: 1 }),
        couponCode: "USED",
        userRedemptionCount: 1,
      }),
    (e: unknown) =>
      e instanceof CheckoutCouponError && e.errorCode === "USER_LIMIT",
  );
  // 12 plan mismatch
  assert.throws(
    () =>
      calculateCheckout({
        plan: planYearly,
        coupon: coupon({
          applicablePlan: "MONTHLY",
          code: "MONLY",
        }),
        couponCode: "MONLY",
      }),
    (e: unknown) =>
      e instanceof CheckoutCouponError && e.errorCode === "PLAN_MISMATCH",
  );
  // 13 clear coupon = no coupon path
  {
    const withC = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({
        type: "PERCENT",
        percentOff: 50,
        freeMonths: null,
        code: "X",
      }),
      couponCode: "X",
    });
    assert.equal(withC.finalAmount, 4400);
    const cleared = calculateCheckout({ plan: planMonthly });
    assert.equal(cleared.finalAmount, 8800);
    assert.equal(cleared.coupon, null);
  }
  // 14 zero activation math
  {
    const r = calculateCheckout({
      plan: planMonthly,
      coupon: coupon({ freeMonths: 3, code: "Z" }),
      couponCode: "Z",
    });
    assert.equal(r.finalAmount, 0);
  }

  // entitlement
  assert.equal(
    isEntitledSubscription({
      status: "ACTIVE",
      trialEndAt: null,
      currentPeriodEnd: null,
    }),
    true,
  );
  assert.equal(
    isEntitledSubscription({
      status: "TRIAL",
      trialEndAt: new Date(Date.now() + 86400000),
      currentPeriodEnd: null,
    }),
    true,
  );
  assert.equal(
    isEntitledSubscription({
      status: "TRIAL",
      trialEndAt: new Date(Date.now() - 86400000),
      currentPeriodEnd: null,
    }),
    false,
  );

  const save = yearlySavingsLabel(8800, 88000);
  assert.ok(save && save.savedAmount === 8800 * 12 - 88000);

  const svc = read("src/lib/services/billing.service.ts");
  assert.match(svc, /calculateCheckout/);
  assert.match(svc, /finalAmount === 0/);
  assert.doesNotMatch(svc, /markPaidMock|fakePaid|devCompletePayment/);

  const provider = read("src/lib/billing/payment-provider.ts");
  assert.match(provider, /toss_billing_auth|tossBillingPaymentProvider/);

  const entitlement = read("src/lib/billing/entitlement.ts");
  assert.match(entitlement, /billingRequiredAt/);
  assert.match(entitlement, /legacy_not_required/);
  assert.match(entitlement, /isBillingBusinessEnforcementActive/);
  assert.match(entitlement, /billing_disabled/);

  const providerCfg = read("src/lib/billing/billing-provider-config.ts");
  assert.match(providerCfg, /isBillingBusinessEnforcementActive/);

  const renewalRoute = read("src/app/api/internal/billing/renewals/run/route.ts");
  assert.match(renewalRoute, /BILLING_DISABLED/);

  const lifecycle = read("src/lib/services/billing-lifecycle.service.ts");
  assert.match(lifecycle, /issueBillingKey/);
  assert.match(lifecycle, /completeTossBillingAuth/);
  assert.doesNotMatch(lifecycle, /billingKey:\s*issued\.billingKey[\s\S]{0,80}return/);

  const renewal = read("src/lib/services/billing-renewal.service.ts");
  assert.match(renewal, /PAST_DUE/);
  assert.match(renewal, /Idempotency|idempotencyKey|FOR UPDATE/);

  const gymApprove = read("src/lib/services/gym-application.service.ts");
  assert.match(gymApprove, /billingRequiredAt/);
  const assocApprove = read("src/lib/services/association-application.service.ts");
  assert.match(assocApprove, /billingRequiredAt/);

  assert.match(schema, /model BillingPaymentMethod/);
  assert.match(schema, /cancelAtPeriodEnd/);
  assert.match(schema, /tossCustomerKey/);
  assert.match(schema, /model BillingProviderConfig/);
  assert.match(schema, /model BillingRuntimeConfig/);

  assert.match(providerCfg, /resolveBillingProviderConfig/);
  assert.match(providerCfg, /isBillingBusinessEnforcementActive/);
  assert.match(read("src/app/api/billing/public-config/route.ts"), /getBillingPublicConfig/);

  console.log("verify:billing-checkout OK");
}

main();
