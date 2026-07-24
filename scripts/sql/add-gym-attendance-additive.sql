-- Additive-only Gym member attendance (Preview/Production)
-- Never DROP. Never destructive push flags.

CREATE TYPE "GymMemberAttendanceSource" AS ENUM ('kiosk', 'admin_manual', 'import');
CREATE TYPE "GymAttendanceKioskDuplicatePolicy" AS ENUM ('once_per_day');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_kiosk_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_kiosk_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_kiosk_revoked';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_kiosk_token_regenerated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_manual_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_attendance_cancelled';

CREATE TABLE IF NOT EXISTS "GymAttendanceKiosk" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicTokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowExpiredMember" BOOLEAN NOT NULL DEFAULT true,
    "allowPausedMember" BOOLEAN NOT NULL DEFAULT true,
    "duplicatePolicy" "GymAttendanceKioskDuplicatePolicy" NOT NULL DEFAULT 'once_per_day',
    "lastUsedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymAttendanceKiosk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMemberAttendance" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "attendedAt" TIMESTAMP(3) NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "source" "GymMemberAttendanceSource" NOT NULL,
    "kioskSessionId" TEXT,
    "createdByUserId" TEXT,
    "note" TEXT,
    "membershipStatusSnapshot" TEXT,
    "deletedAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymAttendanceKiosk_publicTokenHash_key" ON "GymAttendanceKiosk"("publicTokenHash");
CREATE INDEX IF NOT EXISTS "GymAttendanceKiosk_gymId_isActive_idx" ON "GymAttendanceKiosk"("gymId", "isActive");
CREATE INDEX IF NOT EXISTS "GymAttendanceKiosk_gymId_revokedAt_idx" ON "GymAttendanceKiosk"("gymId", "revokedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberAttendance_gymId_gymMemberId_attendanceDate_key" ON "GymMemberAttendance"("gymId", "gymMemberId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "GymMemberAttendance_gymId_attendanceDate_idx" ON "GymMemberAttendance"("gymId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "GymMemberAttendance_gymMemberId_attendanceDate_idx" ON "GymMemberAttendance"("gymMemberId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "GymMemberAttendance_gymId_attendedAt_idx" ON "GymMemberAttendance"("gymId", "attendedAt");
CREATE INDEX IF NOT EXISTS "GymMemberAttendance_gymId_deletedAt_idx" ON "GymMemberAttendance"("gymId", "deletedAt");
