-- Additive only: GymGroupClass + GymGroupClassParticipation + enums + AuditAction.
-- FORBIDDEN: DROP, TRUNCATE, SET NOT NULL, backfill, accept-data-loss.

DO $$ BEGIN
  CREATE TYPE "GymGroupClassStatus" AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymGroupClassVisibility" AS ENUM (
    'members_only',
    'public'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymGroupClassParticipationStatus" AS ENUM (
    'attending',
    'waitlisted',
    'cancelled',
    'not_attending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_completed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_cancelled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_participant_added';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_participant_waitlisted';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_participant_cancelled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_participant_promoted';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_participant_waitlisted_manual';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_capacity_changed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_group_class_instructor_changed';

CREATE TABLE IF NOT EXISTS "GymGroupClass" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructorStaffId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "location" TEXT,
    "status" "GymGroupClassStatus" NOT NULL DEFAULT 'scheduled',
    "visibility" "GymGroupClassVisibility" NOT NULL DEFAULT 'members_only',
    "colorKey" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancellationReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymGroupClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymGroupClassParticipation" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymGroupClassId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "status" "GymGroupClassParticipationStatus" NOT NULL DEFAULT 'attending',
    "waitlistOrder" INTEGER,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymGroupClassParticipation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GymGroupClass_gymId_startsAt_idx"
  ON "GymGroupClass"("gymId", "startsAt");
CREATE INDEX IF NOT EXISTS "GymGroupClass_instructorStaffId_startsAt_idx"
  ON "GymGroupClass"("instructorStaffId", "startsAt");
CREATE INDEX IF NOT EXISTS "GymGroupClass_gymId_status_startsAt_idx"
  ON "GymGroupClass"("gymId", "status", "startsAt");
CREATE INDEX IF NOT EXISTS "GymGroupClass_gymId_deletedAt_idx"
  ON "GymGroupClass"("gymId", "deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "GymGroupClassParticipation_gymGroupClassId_gymMemberId_key"
  ON "GymGroupClassParticipation"("gymGroupClassId", "gymMemberId");
CREATE INDEX IF NOT EXISTS "GymGroupClassParticipation_gymGroupClassId_status_idx"
  ON "GymGroupClassParticipation"("gymGroupClassId", "status");
CREATE INDEX IF NOT EXISTS "GymGroupClassParticipation_gymMemberId_status_idx"
  ON "GymGroupClassParticipation"("gymMemberId", "status");
CREATE INDEX IF NOT EXISTS "GymGroupClassParticipation_gymId_status_idx"
  ON "GymGroupClassParticipation"("gymId", "status");

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_instructorStaffId_fkey"
    FOREIGN KEY ("instructorStaffId") REFERENCES "GymStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_completedByUserId_fkey"
    FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClass" ADD CONSTRAINT "GymGroupClass_cancelledByUserId_fkey"
    FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClassParticipation" ADD CONSTRAINT "GymGroupClassParticipation_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClassParticipation" ADD CONSTRAINT "GymGroupClassParticipation_gymGroupClassId_fkey"
    FOREIGN KEY ("gymGroupClassId") REFERENCES "GymGroupClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClassParticipation" ADD CONSTRAINT "GymGroupClassParticipation_gymMemberId_fkey"
    FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClassParticipation" ADD CONSTRAINT "GymGroupClassParticipation_cancelledByUserId_fkey"
    FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymGroupClassParticipation" ADD CONSTRAINT "GymGroupClassParticipation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
