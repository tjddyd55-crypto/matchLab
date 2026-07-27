-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'fighter_account_setup_link_created';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_account_setup_link_revoked';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_account_setup_completed';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_password_reset_link_created';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_password_reset_completed';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_profile_image_changed';
ALTER TYPE "AuditAction" ADD VALUE 'fighter_profile_image_removed';

-- CreateTable
CREATE TABLE "FighterAccountSetupToken" (
    "id" TEXT NOT NULL,
    "fighterId" TEXT NOT NULL,
    "userId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FighterAccountSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FighterPasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fighterId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestSource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FighterPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FighterAccountSetupToken_tokenHash_key" ON "FighterAccountSetupToken"("tokenHash");

-- CreateIndex
CREATE INDEX "FighterAccountSetupToken_fighterId_idx" ON "FighterAccountSetupToken"("fighterId");

-- CreateIndex
CREATE INDEX "FighterAccountSetupToken_expiresAt_idx" ON "FighterAccountSetupToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FighterPasswordResetToken_tokenHash_key" ON "FighterPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "FighterPasswordResetToken_userId_idx" ON "FighterPasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "FighterPasswordResetToken_fighterId_idx" ON "FighterPasswordResetToken"("fighterId");

-- CreateIndex
CREATE INDEX "FighterPasswordResetToken_expiresAt_idx" ON "FighterPasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "FighterAccountSetupToken" ADD CONSTRAINT "FighterAccountSetupToken_fighterId_fkey" FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FighterAccountSetupToken" ADD CONSTRAINT "FighterAccountSetupToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FighterPasswordResetToken" ADD CONSTRAINT "FighterPasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FighterPasswordResetToken" ADD CONSTRAINT "FighterPasswordResetToken_fighterId_fkey" FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FighterPasswordResetToken" ADD CONSTRAINT "FighterPasswordResetToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
