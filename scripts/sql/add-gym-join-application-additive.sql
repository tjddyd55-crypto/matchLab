-- Additive only: independent gym join schema alignment
-- Safe on fresh DB and on Preview DBs that already have legacy GymApplication.
-- Do NOT run destructive drops.

-- Status enum (fresh only)
DO $$ BEGIN
  CREATE TYPE "GymApplicationStatus" AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attachment enum (fresh only). Existing DBs keep legacy labels and gain new ones below.
DO $$ BEGIN
  CREATE TYPE "GymApplicationAttachmentType" AS ENUM (
    'business_registration',
    'gym_photo',
    'representative_proof',
    'representative_photo',
    'gym_exterior_photo',
    'gym_interior_photo',
    'dan_certificate',
    'coach_certificate',
    'referee_certificate',
    'applicant_signature',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Additive enum values for legacy Preview DBs (IF NOT EXISTS)
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'representative_photo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'gym_exterior_photo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'gym_interior_photo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'dan_certificate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'coach_certificate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'referee_certificate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'applicant_signature';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "GymApplicationAttachmentType" ADD VALUE IF NOT EXISTS 'other';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GymApplication" (
  "id" TEXT PRIMARY KEY,
  "gymName" TEXT NOT NULL,
  "representativeName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "phone" TEXT,
  "mobilePhone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "postalCode" TEXT,
  "address" TEXT,
  "addressDetail" TEXT,
  "businessNo" TEXT,
  "sportType" TEXT,
  "description" TEXT,
  "privacyConsent" BOOLEAN NOT NULL DEFAULT false,
  "registrationConsent" BOOLEAN NOT NULL DEFAULT false,
  "smsConsent" BOOLEAN NOT NULL DEFAULT false,
  "informationConsent" BOOLEAN NOT NULL DEFAULT false,
  "signatureName" TEXT,
  "signatureConsent" BOOLEAN NOT NULL DEFAULT false,
  "signatureSignedAt" TIMESTAMP(3),
  "uploadBatchId" TEXT,
  "status" "GymApplicationStatus" NOT NULL DEFAULT 'pending',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewMemo" TEXT,
  "createdGymId" TEXT,
  "ownerInviteTokenHash" TEXT,
  "ownerInviteExpiresAt" TIMESTAMP(3),
  "ownerInviteCreatedAt" TIMESTAMP(3),
  "ownerInviteCreatedByUserId" TEXT,
  "termsAcceptedAt" TIMESTAMP(3),
  "privacyAcceptedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Nullable columns for legacy tables
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "businessNo" TEXT;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "sportType" TEXT;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "privacyConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "registrationConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "smsConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "informationConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "signatureConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "signatureSignedAt" TIMESTAMP(3);
ALTER TABLE "GymApplication" ADD COLUMN IF NOT EXISTS "uploadBatchId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "GymApplication_ownerInviteTokenHash_key"
  ON "GymApplication"("ownerInviteTokenHash");
CREATE INDEX IF NOT EXISTS "GymApplication_status_idx" ON "GymApplication"("status");
CREATE INDEX IF NOT EXISTS "GymApplication_submittedAt_idx" ON "GymApplication"("submittedAt");
CREATE INDEX IF NOT EXISTS "GymApplication_deletedAt_idx" ON "GymApplication"("deletedAt");

CREATE TABLE IF NOT EXISTS "GymApplicationAttachment" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "attachmentType" "GymApplicationAttachmentType" NOT NULL,
  "storageBucket" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "GymApplicationAttachment_applicationId_idx"
  ON "GymApplicationAttachment"("applicationId");

-- AssociationMemberGymApplication postal (nullable additive)
ALTER TABLE "AssociationMemberGymApplication"
  ADD COLUMN IF NOT EXISTS "homePostalCode" TEXT;
ALTER TABLE "AssociationMemberGymApplication"
  ADD COLUMN IF NOT EXISTS "gymPostalCode" TEXT;

-- AssociationGymConnectionRequest (post-join linking schema only)
DO $$ BEGIN
  CREATE TYPE "AssociationGymConnectionRequestStatus" AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AssociationGymConnectionRequest" (
  "id" TEXT PRIMARY KEY,
  "gymId" TEXT NOT NULL,
  "associationOrganizerId" TEXT NOT NULL,
  "requestingUserId" TEXT NOT NULL,
  "status" "AssociationGymConnectionRequestStatus" NOT NULL DEFAULT 'pending',
  "memo" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewMemo" TEXT,
  "createdAssociationMemberGymId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "AssociationGymConnectionRequest_gymId_associationOrganizerId_idx"
  ON "AssociationGymConnectionRequest"("gymId", "associationOrganizerId");
CREATE INDEX IF NOT EXISTS "AssociationGymConnectionRequest_associationOrganizerId_status_idx"
  ON "AssociationGymConnectionRequest"("associationOrganizerId", "status");
CREATE INDEX IF NOT EXISTS "AssociationGymConnectionRequest_status_idx"
  ON "AssociationGymConnectionRequest"("status");
CREATE INDEX IF NOT EXISTS "AssociationGymConnectionRequest_deletedAt_idx"
  ON "AssociationGymConnectionRequest"("deletedAt");
