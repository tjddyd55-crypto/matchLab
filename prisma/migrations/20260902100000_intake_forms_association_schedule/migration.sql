-- CreateEnum
CREATE TYPE "IntakeFormOwnerType" AS ENUM ('organizer', 'gym');

-- CreateEnum
CREATE TYPE "IntakeFormStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "IntakeFormFieldType" AS ENUM (
  'text',
  'textarea',
  'number',
  'tel',
  'email',
  'date',
  'radio',
  'select',
  'checkbox_group',
  'consent_checkbox',
  'static_info'
);

-- CreateEnum
CREATE TYPE "IntakeFormSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssociationScheduleType" AS ENUM (
  'TOURNAMENT',
  'EDUCATION',
  'MEETING',
  'EVENT',
  'EXAM',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "AssociationScheduleVisibility" AS ENUM ('PRIVATE', 'MEMBER_GYMS');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_duplicated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_closed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_reopened';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_archived';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'intake_form_submission_status_changed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'association_schedule_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'association_schedule_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'association_schedule_deleted';

-- AlterTable
ALTER TABLE "AssociationNotice" ADD COLUMN IF NOT EXISTS "relatedFormId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeForm" (
  "id" TEXT NOT NULL,
  "ownerType" "IntakeFormOwnerType" NOT NULL,
  "organizerId" TEXT,
  "gymId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "IntakeFormStatus" NOT NULL DEFAULT 'DRAFT',
  "publicToken" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "maxSubmissions" INTEGER,
  "completionMessage" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeFormField" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "IntakeFormFieldType" NOT NULL,
  "placeholder" TEXT,
  "helpText" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "optionsJson" JSONB,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntakeFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeFormSubmission" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "status" "IntakeFormSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitterUserId" TEXT,
  "adminMemo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntakeFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeFormAnswer" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "fieldId" TEXT,
  "fieldLabelSnapshot" TEXT NOT NULL,
  "fieldTypeSnapshot" "IntakeFormFieldType" NOT NULL,
  "valueJson" JSONB NOT NULL,

  CONSTRAINT "IntakeFormAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AssociationSchedule" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "AssociationScheduleType" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT,
  "description" TEXT,
  "visibility" "AssociationScheduleVisibility" NOT NULL DEFAULT 'PRIVATE',
  "relatedUrl" TEXT,
  "relatedFormId" TEXT,
  "relatedNoticeId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "AssociationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeForm_publicToken_key" ON "IntakeForm"("publicToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeForm_ownerType_organizerId_deletedAt_updatedAt_idx" ON "IntakeForm"("ownerType", "organizerId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeForm_ownerType_gymId_deletedAt_updatedAt_idx" ON "IntakeForm"("ownerType", "gymId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeForm_status_idx" ON "IntakeForm"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeFormField_formId_stableKey_key" ON "IntakeFormField"("formId", "stableKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeFormField_formId_displayOrder_idx" ON "IntakeFormField"("formId", "displayOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeFormSubmission_formId_submittedAt_idx" ON "IntakeFormSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeFormSubmission_formId_status_idx" ON "IntakeFormSubmission"("formId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeFormAnswer_submissionId_idx" ON "IntakeFormAnswer"("submissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationNotice_relatedFormId_idx" ON "AssociationNotice"("relatedFormId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationSchedule_organizerId_deletedAt_startsAt_idx" ON "AssociationSchedule"("organizerId", "deletedAt", "startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationSchedule_organizerId_visibility_startsAt_idx" ON "AssociationSchedule"("organizerId", "visibility", "startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationSchedule_relatedFormId_idx" ON "AssociationSchedule"("relatedFormId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationSchedule_relatedNoticeId_idx" ON "AssociationSchedule"("relatedNoticeId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationNotice" ADD CONSTRAINT "AssociationNotice_relatedFormId_fkey" FOREIGN KEY ("relatedFormId") REFERENCES "IntakeForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeFormField" ADD CONSTRAINT "IntakeFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeFormSubmission" ADD CONSTRAINT "IntakeFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeFormSubmission" ADD CONSTRAINT "IntakeFormSubmission_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeFormAnswer" ADD CONSTRAINT "IntakeFormAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IntakeFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntakeFormAnswer" ADD CONSTRAINT "IntakeFormAnswer_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "IntakeFormField"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationSchedule" ADD CONSTRAINT "AssociationSchedule_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationSchedule" ADD CONSTRAINT "AssociationSchedule_relatedFormId_fkey" FOREIGN KEY ("relatedFormId") REFERENCES "IntakeForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationSchedule" ADD CONSTRAINT "AssociationSchedule_relatedNoticeId_fkey" FOREIGN KEY ("relatedNoticeId") REFERENCES "AssociationNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationSchedule" ADD CONSTRAINT "AssociationSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
