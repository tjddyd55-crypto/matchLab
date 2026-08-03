-- PhoneVerification OTP (additive only).
-- Idempotent: safe when Development already applied the manual SQL.

DO $$ BEGIN
  CREATE TYPE "PhoneVerificationPurpose" AS ENUM ('signup', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PhoneVerificationAccountType" AS ENUM ('association', 'gym');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PhoneVerificationStatus" AS ENUM (
    'pending',
    'verified',
    'consumed',
    'expired',
    'locked',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PhoneVerification" (
  "id" TEXT NOT NULL,
  "phoneNormalized" TEXT NOT NULL,
  "purpose" "PhoneVerificationPurpose" NOT NULL,
  "accountType" "PhoneVerificationAccountType",
  "codeHash" TEXT NOT NULL,
  "status" "PhoneVerificationStatus" NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "sendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "verificationTokenHash" TEXT,
  "verificationTokenExpiresAt" TIMESTAMP(3),
  "loginIdNormalized" TEXT,
  "userId" TEXT,
  "requestIpHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhoneVerification_verificationTokenHash_key"
  ON "PhoneVerification"("verificationTokenHash");
CREATE INDEX IF NOT EXISTS "PhoneVerification_phoneNormalized_purpose_status_idx"
  ON "PhoneVerification"("phoneNormalized", "purpose", "status");
CREATE INDEX IF NOT EXISTS "PhoneVerification_loginIdNormalized_purpose_status_idx"
  ON "PhoneVerification"("loginIdNormalized", "purpose", "status");
CREATE INDEX IF NOT EXISTS "PhoneVerification_expiresAt_idx"
  ON "PhoneVerification"("expiresAt");
CREATE INDEX IF NOT EXISTS "PhoneVerification_userId_idx"
  ON "PhoneVerification"("userId");

DO $$ BEGIN
  ALTER TABLE "PhoneVerification"
    ADD CONSTRAINT "PhoneVerification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'phone_verification_code_sent'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'phone_verification_succeeded'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'phone_verification_failed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'password_reset_by_phone_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
