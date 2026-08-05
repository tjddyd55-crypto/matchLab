-- Additive: GymMemberPortal.publicToken for persistent admin link display.
-- URL token is a gym entry locator (not member auth secret).
-- Legacy rows remain NULL until owner rotates/creates a new link.

ALTER TABLE "GymMemberPortal"
  ADD COLUMN IF NOT EXISTS "publicToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "GymMemberPortal_publicToken_key"
  ON "GymMemberPortal"("publicToken");
