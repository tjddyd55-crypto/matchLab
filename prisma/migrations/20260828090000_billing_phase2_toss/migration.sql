-- Phase 2: per-user billing requirement + Toss billing method + subscription renewal fields

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingRequiredAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingExempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tossCustomerKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_tossCustomerKey_key" ON "User"("tossCustomerKey");

CREATE TABLE IF NOT EXISTS "BillingPaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'toss',
    "customerKey" TEXT NOT NULL,
    "billingKey" TEXT NOT NULL,
    "cardCompany" TEXT,
    "cardLast4" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BillingPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_userId_deletedAt_isDefault_idx" ON "BillingPaymentMethod"("userId", "deletedAt", "isDefault");
CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_customerKey_idx" ON "BillingPaymentMethod"("customerKey");

ALTER TABLE "BillingPaymentMethod" DROP CONSTRAINT IF EXISTS "BillingPaymentMethod_userId_fkey";
ALTER TABLE "BillingPaymentMethod" ADD CONSTRAINT "BillingPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;

CREATE INDEX IF NOT EXISTS "BillingSubscription_status_nextBillingAt_autoRenew_idx" ON "BillingSubscription"("status", "nextBillingAt", "autoRenew");
CREATE INDEX IF NOT EXISTS "BillingSubscription_paymentMethodId_idx" ON "BillingSubscription"("paymentMethodId");

ALTER TABLE "BillingSubscription" DROP CONSTRAINT IF EXISTS "BillingSubscription_paymentMethodId_fkey";
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "BillingPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "failureCode" TEXT;
ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "failureMessage" TEXT;

-- Mark existing gym/organizer without legacy ACTIVE as billing-required only if they have no entitled path.
-- Legacy ACTIVE (provider=legacy) stay exempt via entitlement; do NOT set billingRequiredAt on them.
-- New approvals set billingRequiredAt in application code.
