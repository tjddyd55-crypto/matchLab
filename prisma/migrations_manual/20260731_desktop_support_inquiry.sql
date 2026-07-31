-- Stage PC-3: DesktopSupportInquiry (additive only)
-- Safe to re-run: IF NOT EXISTS / DO blocks

DO $$ BEGIN
  CREATE TYPE "DesktopSupportInquiryCategory" AS ENUM (
    'password_help',
    'login_issue',
    'desktop_bug',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DesktopSupportInquirySource" AS ENUM (
    'desktop',
    'web'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DesktopSupportInquiryStatus" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DesktopSupportInquiry" (
  "id" TEXT NOT NULL,
  "category" "DesktopSupportInquiryCategory" NOT NULL,
  "source" "DesktopSupportInquirySource" NOT NULL DEFAULT 'desktop',
  "name" TEXT NOT NULL,
  "loginId" TEXT,
  "contact" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "appVersion" TEXT,
  "roleHint" TEXT,
  "status" "DesktopSupportInquiryStatus" NOT NULL DEFAULT 'open',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "DesktopSupportInquiry_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "DesktopSupportInquiry"
    ADD CONSTRAINT "DesktopSupportInquiry_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "DesktopSupportInquiry_status_createdAt_idx"
  ON "DesktopSupportInquiry"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DesktopSupportInquiry_category_createdAt_idx"
  ON "DesktopSupportInquiry"("category", "createdAt");
CREATE INDEX IF NOT EXISTS "DesktopSupportInquiry_source_createdAt_idx"
  ON "DesktopSupportInquiry"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "DesktopSupportInquiry_deletedAt_idx"
  ON "DesktopSupportInquiry"("deletedAt");
CREATE INDEX IF NOT EXISTS "DesktopSupportInquiry_resolvedByUserId_idx"
  ON "DesktopSupportInquiry"("resolvedByUserId");

-- Additive AuditAction value (safe re-run)
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'desktop_support_inquiry_status_changed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
