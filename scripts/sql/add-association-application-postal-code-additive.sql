-- Additive only: AssociationApplication.postalCode
-- No DROP / SET NOT NULL / type change / backfill

ALTER TABLE "AssociationApplication"
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
