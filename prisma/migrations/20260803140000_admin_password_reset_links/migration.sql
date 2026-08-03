-- Admin-issued one-time password reset links (additive only).

DO $$ BEGIN
  CREATE TYPE "AdminPasswordResetAccountType" AS ENUM ('association', 'gym');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminPasswordResetLinkStatus" AS ENUM (
    'active',
    'consumed',
    'expired',
    'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminPasswordResetLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authUserId" TEXT NOT NULL,
  "accountType" "AdminPasswordResetAccountType" NOT NULL,
  "organizerId" TEXT,
  "gymId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "challengeTokenHash" TEXT,
  "challengeExpiresAt" TIMESTAMP(3),
  "status" "AdminPasswordResetLinkStatus" NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "issuedByUserId" TEXT NOT NULL,
  "revokedByUserId" TEXT,
  "consumedIpHash" TEXT,
  "consumedUserAgentHash" TEXT,
  "inquiryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPasswordResetLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasswordResetLink_tokenHash_key"
  ON "AdminPasswordResetLink"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasswordResetLink_challengeTokenHash_key"
  ON "AdminPasswordResetLink"("challengeTokenHash");
CREATE INDEX IF NOT EXISTS "AdminPasswordResetLink_userId_status_idx"
  ON "AdminPasswordResetLink"("userId", "status");
CREATE INDEX IF NOT EXISTS "AdminPasswordResetLink_expiresAt_idx"
  ON "AdminPasswordResetLink"("expiresAt");
CREATE INDEX IF NOT EXISTS "AdminPasswordResetLink_issuedByUserId_idx"
  ON "AdminPasswordResetLink"("issuedByUserId");
CREATE INDEX IF NOT EXISTS "AdminPasswordResetLink_inquiryId_idx"
  ON "AdminPasswordResetLink"("inquiryId");
CREATE INDEX IF NOT EXISTS "AdminPasswordResetLink_status_createdAt_idx"
  ON "AdminPasswordResetLink"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AdminPasswordResetLink"
    ADD CONSTRAINT "AdminPasswordResetLink_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminPasswordResetLink"
    ADD CONSTRAINT "AdminPasswordResetLink_issuedByUserId_fkey"
    FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminPasswordResetLink"
    ADD CONSTRAINT "AdminPasswordResetLink_revokedByUserId_fkey"
    FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'admin_password_reset_link_issued'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'admin_password_reset_link_revoked'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'password_reset_by_admin_link_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'admin_password_reset_link_failed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
