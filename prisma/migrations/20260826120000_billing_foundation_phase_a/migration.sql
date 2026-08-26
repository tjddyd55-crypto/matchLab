-- Billing Foundation Phase A: BillingAccount + CreditWallet + CreditLedger
-- Additive only. Legacy OrganizerCredit* tables preserved.

-- Enums
CREATE TYPE "BillingOwnerType" AS ENUM ('organizer', 'gym');
CREATE TYPE "BillingAccountStatus" AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE "BillingLedgerType" AS ENUM (
  'payment_charge',
  'manual_charge',
  'usage',
  'refund',
  'adjustment',
  'promotion'
);
CREATE TYPE "BillingServiceType" AS ENUM ('event', 'sms', 'fightbox', 'admin', 'other');
CREATE TYPE "BillingReferenceType" AS ENUM (
  'event_application',
  'sms_dispatch',
  'fightbox_usage',
  'organizer_credit_payment',
  'admin_manual',
  'legacy_organizer_ledger',
  'other'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'credit_manual_charged';

CREATE TABLE "BillingAccount" (
  "id" TEXT NOT NULL,
  "ownerType" "BillingOwnerType" NOT NULL,
  "organizerId" TEXT,
  "gymId" TEXT,
  "status" "BillingAccountStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingAccount_organizerId_key" ON "BillingAccount"("organizerId");
CREATE UNIQUE INDEX "BillingAccount_gymId_key" ON "BillingAccount"("gymId");
CREATE INDEX "BillingAccount_ownerType_status_idx" ON "BillingAccount"("ownerType", "status");

ALTER TABLE "BillingAccount"
  ADD CONSTRAINT "BillingAccount_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingAccount"
  ADD CONSTRAINT "BillingAccount_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Owner integrity: organizer XOR gym matching ownerType
ALTER TABLE "BillingAccount"
  ADD CONSTRAINT "BillingAccount_owner_integrity_check"
  CHECK (
    (
      "ownerType" = 'organizer'
      AND "organizerId" IS NOT NULL
      AND "gymId" IS NULL
    )
    OR (
      "ownerType" = 'gym'
      AND "gymId" IS NOT NULL
      AND "organizerId" IS NULL
    )
  );

CREATE TABLE "CreditWallet" (
  "id" TEXT NOT NULL,
  "billingAccountId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreditWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditWallet_billingAccountId_key" ON "CreditWallet"("billingAccountId");

ALTER TABLE "CreditWallet"
  ADD CONSTRAINT "CreditWallet_billingAccountId_fkey"
  FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditWallet"
  ADD CONSTRAINT "CreditWallet_balance_nonnegative_check"
  CHECK ("balance" >= 0);

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "BillingLedgerType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "serviceType" "BillingServiceType" NOT NULL,
  "referenceType" "BillingReferenceType",
  "referenceId" TEXT,
  "idempotencyKey" TEXT,
  "actorUserId" TEXT,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "legacyLedgerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditLedger_idempotencyKey_key" ON "CreditLedger"("idempotencyKey");
CREATE UNIQUE INDEX "CreditLedger_legacyLedgerId_key" ON "CreditLedger"("legacyLedgerId");
CREATE INDEX "CreditLedger_walletId_createdAt_idx" ON "CreditLedger"("walletId", "createdAt");
CREATE INDEX "CreditLedger_serviceType_createdAt_idx" ON "CreditLedger"("serviceType", "createdAt");
CREATE INDEX "CreditLedger_referenceType_referenceId_idx" ON "CreditLedger"("referenceType", "referenceId");
CREATE INDEX "CreditLedger_actorUserId_idx" ON "CreditLedger"("actorUserId");

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
