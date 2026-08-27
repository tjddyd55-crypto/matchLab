-- MATCHON platform SaaS billing (additive only).
-- Distinct from GymMemberSubscription, OrganizerCreditPayment, EventApplicationPayment.

CREATE TYPE "BillingPlanInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('READY', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "BillingCouponType" AS ENUM ('FREE_MONTHS', 'PERCENT', 'FIXED_AMOUNT');
CREATE TYPE "BillingCouponApplicablePlan" AS ENUM ('ALL', 'MONTHLY', 'YEARLY');

CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interval" "BillingPlanInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");
CREATE INDEX "BillingPlan_isActive_sortOrder_idx" ON "BillingPlan"("isActive", "sortOrder");

CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "billingInterval" "BillingPlanInterval" NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "currentPrice" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "trialStartedAt" TIMESTAMP(3),
    "trialEndAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'none',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingSubscription_userId_status_idx" ON "BillingSubscription"("userId", "status");
CREATE INDEX "BillingSubscription_status_currentPeriodEnd_idx" ON "BillingSubscription"("status", "currentPeriodEnd");
CREATE INDEX "BillingSubscription_status_trialEndAt_idx" ON "BillingSubscription"("status", "trialEndAt");
CREATE INDEX "BillingSubscription_planId_idx" ON "BillingSubscription"("planId");

CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "originalAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "BillingPaymentStatus" NOT NULL DEFAULT 'READY',
    "paymentMethod" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'none',
    "providerPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPayment_orderId_key" ON "BillingPayment"("orderId");
CREATE INDEX "BillingPayment_userId_createdAt_idx" ON "BillingPayment"("userId", "createdAt");
CREATE INDEX "BillingPayment_subscriptionId_idx" ON "BillingPayment"("subscriptionId");
CREATE INDEX "BillingPayment_status_createdAt_idx" ON "BillingPayment"("status", "createdAt");
CREATE INDEX "BillingPayment_planId_idx" ON "BillingPayment"("planId");

CREATE TABLE "BillingCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BillingCouponType" NOT NULL,
    "freeMonths" INTEGER,
    "percentOff" INTEGER,
    "fixedAmountOff" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "applicablePlan" "BillingCouponApplicablePlan" NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCoupon_code_key" ON "BillingCoupon"("code");
CREATE INDEX "BillingCoupon_isActive_expiresAt_idx" ON "BillingCoupon"("isActive", "expiresAt");
CREATE INDEX "BillingCoupon_type_idx" ON "BillingCoupon"("type");

CREATE TABLE "BillingCouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentId" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "freeMonths" INTEGER,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingCouponRedemption_couponId_redeemedAt_idx" ON "BillingCouponRedemption"("couponId", "redeemedAt");
CREATE INDEX "BillingCouponRedemption_userId_couponId_idx" ON "BillingCouponRedemption"("userId", "couponId");
CREATE INDEX "BillingCouponRedemption_subscriptionId_idx" ON "BillingCouponRedemption"("subscriptionId");
CREATE UNIQUE INDEX "BillingCouponRedemption_userId_couponId_key" ON "BillingCouponRedemption"("userId", "couponId");

ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCoupon" ADD CONSTRAINT "BillingCoupon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingCouponRedemption" ADD CONSTRAINT "BillingCouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "BillingCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCouponRedemption" ADD CONSTRAINT "BillingCouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCouponRedemption" ADD CONSTRAINT "BillingCouponRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingCouponRedemption" ADD CONSTRAINT "BillingCouponRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BillingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed plans.
-- Amounts mirror insurance CRM billing_plans.insurance_basic (monthly_total / yearly_total).
-- MATCHON has no independent published SaaS price sheet; Admin must confirm/update before PG go-live.
-- Do NOT hardcode these in UI — always read BillingPlan.price.

INSERT INTO "BillingPlan" ("id", "code", "name", "interval", "intervalCount", "price", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('billing_plan_monthly', 'MONTHLY', '월간 이용권', 'MONTH', 1, 8800, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('billing_plan_yearly', 'YEARLY', '연간 이용권', 'YEAR', 1, 88000, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Grandfather existing gym/organizer accounts so enforce does not lock production users.
INSERT INTO "BillingSubscription" (
  "id", "userId", "planId", "status", "billingInterval", "basePrice", "currentPrice",
  "startedAt", "currentPeriodStart", "currentPeriodEnd", "provider", "createdAt", "updatedAt"
)
SELECT
  'billing_legacy_' || u."id",
  u."id",
  'billing_plan_monthly',
  'ACTIVE',
  'MONTH',
  8800,
  0,
  u."createdAt",
  u."createdAt",
  NULL,
  'legacy',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" IN ('gym', 'organizer')
  AND NOT EXISTS (
    SELECT 1 FROM "BillingSubscription" s WHERE s."userId" = u."id"
  );
