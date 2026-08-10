-- CreateEnum
CREATE TYPE "GymMemberSubscriptionCreationSource" AS ENUM ('sell', 'renew', 'excel_import');

-- CreateEnum
CREATE TYPE "GymMemberImportSourceRegistrationType" AS ENUM ('new_member', 'renewal', 'unknown');

-- CreateEnum
CREATE TYPE "GymMemberImportBatchStatus" AS ENUM ('preview', 'completed', 'failed', 'cancelled');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'gym_member_import_completed';

-- CreateTable
CREATE TABLE "GymMemberImportBatch" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "status" "GymMemberImportBatchStatus" NOT NULL DEFAULT 'preview',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GymMemberImportBatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GymMemberSubscription"
ADD COLUMN "creationSource" "GymMemberSubscriptionCreationSource" NOT NULL DEFAULT 'sell',
ADD COLUMN "sourceRegistrationType" "GymMemberImportSourceRegistrationType",
ADD COLUMN "importBatchId" TEXT,
ADD COLUMN "importMeta" JSONB;

-- AlterTable
ALTER TABLE "GymMemberPayment"
ADD COLUMN "taxAmount" INTEGER,
ADD COLUMN "importBatchId" TEXT;

-- CreateIndex
CREATE INDEX "GymMemberImportBatch_gymId_createdAt_idx" ON "GymMemberImportBatch"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "GymMemberSubscription_gymMemberId_creationSource_idx" ON "GymMemberSubscription"("gymMemberId", "creationSource");

-- CreateIndex
CREATE INDEX "GymMemberSubscription_importBatchId_idx" ON "GymMemberSubscription"("importBatchId");

-- CreateIndex
CREATE INDEX "GymMemberPayment_importBatchId_idx" ON "GymMemberPayment"("importBatchId");

-- AddForeignKey
ALTER TABLE "GymMemberImportBatch" ADD CONSTRAINT "GymMemberImportBatch_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GymMemberSubscription" ADD CONSTRAINT "GymMemberSubscription_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "GymMemberImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymMemberPayment" ADD CONSTRAINT "GymMemberPayment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "GymMemberImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
