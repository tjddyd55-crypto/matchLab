-- Additive GymMember self-registration (Development yamanote only)
-- Never DROP / TRUNCATE / SET NOT NULL / TYPE change

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_link_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_link_revoked';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_link_regenerated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_terms_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_submitted';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_self_registration_rejected';

DO $$ BEGIN
  CREATE TYPE "GymMemberSelfRegistrationLinkStatus" AS ENUM ('active', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymMemberRegistrationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GymMemberSelfRegistrationLink" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "GymMemberSelfRegistrationLinkStatus" NOT NULL DEFAULT 'active',
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "lastSubmittedAt" TIMESTAMP(3),
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberSelfRegistrationLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberSelfRegistrationLink_gymId_key"
  ON "GymMemberSelfRegistrationLink"("gymId");
CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberSelfRegistrationLink_tokenHash_key"
  ON "GymMemberSelfRegistrationLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "GymMemberSelfRegistrationLink_status_idx"
  ON "GymMemberSelfRegistrationLink"("status");

CREATE TABLE IF NOT EXISTS "GymMemberRegistrationTerms" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberRegistrationTerms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberRegistrationTerms_gymId_version_key"
  ON "GymMemberRegistrationTerms"("gymId", "version");
CREATE INDEX IF NOT EXISTS "GymMemberRegistrationTerms_gymId_isActive_idx"
  ON "GymMemberRegistrationTerms"("gymId", "isActive");

CREATE TABLE IF NOT EXISTS "GymMemberRegistrationRequest" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "status" "GymMemberRegistrationRequestStatus" NOT NULL DEFAULT 'pending',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "occupationOrSchool" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "preferredTimeBand" TEXT,
    "purposeText" TEXT,
    "experienceText" TEXT,
    "healthHasAnyYes" BOOLEAN NOT NULL DEFAULT false,
    "formSnapshot" JSONB NOT NULL,
    "healthSnapshot" JSONB NOT NULL,
    "consentSnapshot" JSONB NOT NULL,
    "signaturePath" TEXT NOT NULL,
    "signatureSignedAt" TIMESTAMP(3) NOT NULL,
    "guardianSignaturePath" TEXT,
    "guardianSignedAt" TIMESTAMP(3),
    "termsVersion" INTEGER NOT NULL,
    "termsTitle" TEXT NOT NULL,
    "termsContent" TEXT NOT NULL,
    "privacyAgreedAt" TIMESTAMP(3) NOT NULL,
    "termsAgreedAt" TIMESTAMP(3) NOT NULL,
    "clientSubmissionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectReason" TEXT,
    "approvedGymMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberRegistrationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberRegistrationRequest_approvedGymMemberId_key"
  ON "GymMemberRegistrationRequest"("approvedGymMemberId");
CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberRegistrationRequest_linkId_clientSubmissionId_key"
  ON "GymMemberRegistrationRequest"("linkId", "clientSubmissionId");
CREATE INDEX IF NOT EXISTS "GymMemberRegistrationRequest_gymId_status_submittedAt_idx"
  ON "GymMemberRegistrationRequest"("gymId", "status", "submittedAt");
CREATE INDEX IF NOT EXISTS "GymMemberRegistrationRequest_gymId_normalizedPhone_idx"
  ON "GymMemberRegistrationRequest"("gymId", "normalizedPhone");

DO $$ BEGIN
  ALTER TABLE "GymMemberSelfRegistrationLink"
    ADD CONSTRAINT "GymMemberSelfRegistrationLink_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberRegistrationTerms"
    ADD CONSTRAINT "GymMemberRegistrationTerms_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberRegistrationRequest"
    ADD CONSTRAINT "GymMemberRegistrationRequest_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberRegistrationRequest"
    ADD CONSTRAINT "GymMemberRegistrationRequest_linkId_fkey"
    FOREIGN KEY ("linkId") REFERENCES "GymMemberSelfRegistrationLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GymMemberRegistrationRequest"
    ADD CONSTRAINT "GymMemberRegistrationRequest_approvedGymMemberId_fkey"
    FOREIGN KEY ("approvedGymMemberId") REFERENCES "GymMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
