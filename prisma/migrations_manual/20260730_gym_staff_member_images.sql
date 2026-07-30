-- Additive only: GymStaff, assignments, setup/reset tokens, member image audit, gym_staff role.
-- FORBIDDEN: DROP, SET NOT NULL, backfill, accept-data-loss.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'gym_staff';

DO $$ BEGIN
  CREATE TYPE "GymStaffRole" AS ENUM ('owner', 'manager', 'instructor', 'trainer', 'desk');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymStaffAssignmentType" AS ENUM ('PT', 'GROUP', 'GENERAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 회원 사진: private 버킷 객체 경로만 저장 (URL 미저장)
ALTER TABLE "GymMember" ADD COLUMN IF NOT EXISTS "profileImagePath" TEXT;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_profile_image_changed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_profile_image_removed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_deactivated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_account_setup_link_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_account_setup_link_revoked';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_account_setup_completed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_password_reset_link_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_password_reset_completed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_member_assigned';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_staff_member_unassigned';

CREATE TABLE IF NOT EXISTS "GymStaff" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "email" TEXT,
    "staffRole" "GymStaffRole" NOT NULL DEFAULT 'instructor',
    "title" TEXT,
    "profileImagePath" TEXT,
    "colorKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymStaffMemberAssignment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymStaffId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "assignmentType" "GymStaffAssignmentType" NOT NULL DEFAULT 'GENERAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymStaffMemberAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymStaffAccountSetupToken" (
    "id" TEXT NOT NULL,
    "gymStaffId" TEXT NOT NULL,
    "userId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymStaffAccountSetupToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymStaffPasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gymStaffId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestSource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymStaffPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymStaff_userId_key" ON "GymStaff"("userId");
CREATE INDEX IF NOT EXISTS "GymStaff_gymId_deletedAt_idx" ON "GymStaff"("gymId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymStaff_gymId_isActive_idx" ON "GymStaff"("gymId", "isActive");
CREATE INDEX IF NOT EXISTS "GymStaff_gymId_normalizedPhone_idx" ON "GymStaff"("gymId", "normalizedPhone");
CREATE INDEX IF NOT EXISTS "GymStaff_gymId_name_idx" ON "GymStaff"("gymId", "name");

CREATE INDEX IF NOT EXISTS "GymStaffMemberAssignment_gymId_deletedAt_idx" ON "GymStaffMemberAssignment"("gymId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymStaffMemberAssignment_gymStaffId_deletedAt_idx" ON "GymStaffMemberAssignment"("gymStaffId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymStaffMemberAssignment_gymMemberId_deletedAt_idx" ON "GymStaffMemberAssignment"("gymMemberId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymStaffMemberAssignment_gymMemberId_isPrimary_deletedAt_idx" ON "GymStaffMemberAssignment"("gymMemberId", "isPrimary", "deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "GymStaffAccountSetupToken_tokenHash_key" ON "GymStaffAccountSetupToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "GymStaffAccountSetupToken_gymStaffId_idx" ON "GymStaffAccountSetupToken"("gymStaffId");
CREATE INDEX IF NOT EXISTS "GymStaffAccountSetupToken_expiresAt_idx" ON "GymStaffAccountSetupToken"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "GymStaffPasswordResetToken_tokenHash_key" ON "GymStaffPasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "GymStaffPasswordResetToken_userId_idx" ON "GymStaffPasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "GymStaffPasswordResetToken_gymStaffId_idx" ON "GymStaffPasswordResetToken"("gymStaffId");
CREATE INDEX IF NOT EXISTS "GymStaffPasswordResetToken_expiresAt_idx" ON "GymStaffPasswordResetToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "GymStaff" ADD CONSTRAINT "GymStaff_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaff" ADD CONSTRAINT "GymStaff_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffMemberAssignment" ADD CONSTRAINT "GymStaffMemberAssignment_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffMemberAssignment" ADD CONSTRAINT "GymStaffMemberAssignment_gymStaffId_fkey"
    FOREIGN KEY ("gymStaffId") REFERENCES "GymStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffMemberAssignment" ADD CONSTRAINT "GymStaffMemberAssignment_gymMemberId_fkey"
    FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffAccountSetupToken" ADD CONSTRAINT "GymStaffAccountSetupToken_gymStaffId_fkey"
    FOREIGN KEY ("gymStaffId") REFERENCES "GymStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffAccountSetupToken" ADD CONSTRAINT "GymStaffAccountSetupToken_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffPasswordResetToken" ADD CONSTRAINT "GymStaffPasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffPasswordResetToken" ADD CONSTRAINT "GymStaffPasswordResetToken_gymStaffId_fkey"
    FOREIGN KEY ("gymStaffId") REFERENCES "GymStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymStaffPasswordResetToken" ADD CONSTRAINT "GymStaffPasswordResetToken_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
