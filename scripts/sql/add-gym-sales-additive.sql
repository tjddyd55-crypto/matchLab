-- Additive-only Gym sales / refund / receivable (Preview/Production)
-- Never DROP. Never destructive push flags.

CREATE TYPE "GymSalesCategory" AS ENUM ('membership', 'personal_lesson', 'group_class', 'product', 'event', 'other');
CREATE TYPE "GymReceivableStatus" AS ENUM ('pending', 'partial', 'overdue', 'paid', 'cancelled');

ALTER TYPE "GymMemberPaymentMethod" ADD VALUE IF NOT EXISTS 'easy_pay';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_sales_manual_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_sales_manual_cancelled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_payment_refund_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_payment_refund_cancelled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_receivable_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_receivable_payment_recorded';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_receivable_cancelled';

ALTER TABLE "GymMemberPayment" ADD COLUMN IF NOT EXISTS "receivableId" TEXT;
ALTER TABLE "GymMemberPayment" ADD COLUMN IF NOT EXISTS "listPrice" INTEGER;
ALTER TABLE "GymMemberPayment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GymMemberPayment" ADD COLUMN IF NOT EXISTS "category" "GymSalesCategory";

CREATE TABLE IF NOT EXISTS "GymManualSale" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT,
    "title" TEXT NOT NULL,
    "category" "GymSalesCategory" NOT NULL DEFAULT 'other',
    "soldAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "listPrice" INTEGER,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "GymMemberPaymentMethod" NOT NULL DEFAULT 'cash',
    "status" "GymMemberPaymentStatus" NOT NULL DEFAULT 'paid',
    "memo" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymManualSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymPaymentRefund" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "paymentId" TEXT,
    "manualSaleId" TEXT,
    "amount" INTEGER NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL,
    "refundMethod" "GymMemberPaymentMethod" NOT NULL DEFAULT 'cash',
    "reason" TEXT,
    "memo" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymPaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymReceivable" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "GymSalesCategory",
    "totalAmount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "GymReceivableStatus" NOT NULL DEFAULT 'pending',
    "subscriptionId" TEXT,
    "memo" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymReceivable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GymMemberPayment_gymId_status_paidAt_idx" ON "GymMemberPayment"("gymId", "status", "paidAt");
CREATE INDEX IF NOT EXISTS "GymMemberPayment_receivableId_idx" ON "GymMemberPayment"("receivableId");
CREATE INDEX IF NOT EXISTS "GymManualSale_gymId_soldAt_idx" ON "GymManualSale"("gymId", "soldAt");
CREATE INDEX IF NOT EXISTS "GymManualSale_gymId_status_soldAt_idx" ON "GymManualSale"("gymId", "status", "soldAt");
CREATE INDEX IF NOT EXISTS "GymPaymentRefund_gymId_refundedAt_idx" ON "GymPaymentRefund"("gymId", "refundedAt");
CREATE INDEX IF NOT EXISTS "GymPaymentRefund_paymentId_idx" ON "GymPaymentRefund"("paymentId");
CREATE INDEX IF NOT EXISTS "GymPaymentRefund_manualSaleId_idx" ON "GymPaymentRefund"("manualSaleId");
CREATE INDEX IF NOT EXISTS "GymReceivable_gymId_status_idx" ON "GymReceivable"("gymId", "status");
CREATE INDEX IF NOT EXISTS "GymReceivable_gymMemberId_status_idx" ON "GymReceivable"("gymMemberId", "status");
CREATE INDEX IF NOT EXISTS "GymReceivable_gymId_dueDate_idx" ON "GymReceivable"("gymId", "dueDate");
