-- Additive only: GymPersonalSchedule + enums + AuditAction.
-- FORBIDDEN: DROP, TRUNCATE, SET NOT NULL, backfill, accept-data-loss.

DO $$ BEGIN
  CREATE TYPE "GymPersonalScheduleType" AS ENUM (
    'personal_training',
    'consultation',
    'body_check',
    'rehabilitation',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymPersonalScheduleStatus" AS ENUM (
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_personal_schedule_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_personal_schedule_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_personal_schedule_completed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_personal_schedule_no_show';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_personal_schedule_cancelled';

CREATE TABLE IF NOT EXISTS "GymPersonalSchedule" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymStaffId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduleType" "GymPersonalScheduleType" NOT NULL DEFAULT 'personal_training',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "GymPersonalScheduleStatus" NOT NULL DEFAULT 'scheduled',
    "location" TEXT,
    "memo" TEXT,
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

    CONSTRAINT "GymPersonalSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GymPersonalSchedule_gymId_startsAt_idx"
  ON "GymPersonalSchedule"("gymId", "startsAt");
CREATE INDEX IF NOT EXISTS "GymPersonalSchedule_gymStaffId_startsAt_idx"
  ON "GymPersonalSchedule"("gymStaffId", "startsAt");
CREATE INDEX IF NOT EXISTS "GymPersonalSchedule_gymMemberId_startsAt_idx"
  ON "GymPersonalSchedule"("gymMemberId", "startsAt");
CREATE INDEX IF NOT EXISTS "GymPersonalSchedule_gymId_status_startsAt_idx"
  ON "GymPersonalSchedule"("gymId", "status", "startsAt");
CREATE INDEX IF NOT EXISTS "GymPersonalSchedule_gymId_deletedAt_idx"
  ON "GymPersonalSchedule"("gymId", "deletedAt");

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_gymStaffId_fkey"
    FOREIGN KEY ("gymStaffId") REFERENCES "GymStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_gymMemberId_fkey"
    FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_completedByUserId_fkey"
    FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymPersonalSchedule" ADD CONSTRAINT "GymPersonalSchedule_cancelledByUserId_fkey"
    FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
