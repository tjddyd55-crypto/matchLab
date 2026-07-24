-- Additive-only PublicPartner schema (Preview/Production)
-- Does NOT modify Organizer / Association / EventApplication
-- Does NOT backfill Organizer logos into PublicPartner

-- Expand PublicPartnerType enum (keep existing sponsor/partner)
ALTER TYPE "PublicPartnerType" ADD VALUE IF NOT EXISTS 'association';
ALTER TYPE "PublicPartnerType" ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE "PublicPartnerType" ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE "PublicPartnerType" ADD VALUE IF NOT EXISTS 'supplier';
ALTER TYPE "PublicPartnerType" ADD VALUE IF NOT EXISTS 'other';

-- Nullable / defaulted columns only
ALTER TABLE "PublicPartner" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PublicPartner" ADD COLUMN IF NOT EXISTS "openInNewTab" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PublicPartner" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "PublicPartner" ADD COLUMN IF NOT EXISTS "updatedByUserId" TEXT;

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "PublicPartner_isActive_deletedAt_sortOrder_idx"
  ON "PublicPartner"("isActive", "deletedAt", "sortOrder");
CREATE INDEX IF NOT EXISTS "PublicPartner_startsAt_endsAt_idx"
  ON "PublicPartner"("startsAt", "endsAt");
