-- Stage 4: Gym member portal (additive only)
-- GymMemberPortal + GymMemberPortalSession + AuditAction values
-- NO DROP / TRUNCATE / SET NOT NULL / no data-loss flags

-- AuditAction enum values (idempotent)
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_portal_created';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_portal_token_rotated';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_portal_revoked';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GymMemberPortal" (
  "id" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "publicTokenHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "lastRotatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymMemberPortal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberPortal_publicTokenHash_key"
  ON "GymMemberPortal"("publicTokenHash");

CREATE INDEX IF NOT EXISTS "GymMemberPortal_gymId_isActive_idx"
  ON "GymMemberPortal"("gymId", "isActive");

CREATE INDEX IF NOT EXISTS "GymMemberPortal_gymId_revokedAt_idx"
  ON "GymMemberPortal"("gymId", "revokedAt");

-- Gym당 활성 portal 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberPortal_gymId_active_uidx"
  ON "GymMemberPortal"("gymId")
  WHERE "isActive" = true AND "revokedAt" IS NULL;

DO $$ BEGIN
  ALTER TABLE "GymMemberPortal"
    ADD CONSTRAINT "GymMemberPortal_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberPortal"
    ADD CONSTRAINT "GymMemberPortal_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GymMemberPortalSession" (
  "id" TEXT NOT NULL,
  "gymMemberPortalId" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "gymMemberId" TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymMemberPortalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberPortalSession_sessionTokenHash_key"
  ON "GymMemberPortalSession"("sessionTokenHash");

CREATE INDEX IF NOT EXISTS "GymMemberPortalSession_gymMemberPortalId_revokedAt_idx"
  ON "GymMemberPortalSession"("gymMemberPortalId", "revokedAt");

CREATE INDEX IF NOT EXISTS "GymMemberPortalSession_gymMemberId_expiresAt_idx"
  ON "GymMemberPortalSession"("gymMemberId", "expiresAt");

CREATE INDEX IF NOT EXISTS "GymMemberPortalSession_gymId_expiresAt_idx"
  ON "GymMemberPortalSession"("gymId", "expiresAt");

DO $$ BEGIN
  ALTER TABLE "GymMemberPortalSession"
    ADD CONSTRAINT "GymMemberPortalSession_gymMemberPortalId_fkey"
    FOREIGN KEY ("gymMemberPortalId") REFERENCES "GymMemberPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberPortalSession"
    ADD CONSTRAINT "GymMemberPortalSession_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberPortalSession"
    ADD CONSTRAINT "GymMemberPortalSession_gymMemberId_fkey"
    FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
