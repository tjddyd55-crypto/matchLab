-- Additive: application requested login IDs for association/gym join.

ALTER TABLE "AssociationApplication"
  ADD COLUMN IF NOT EXISTS "requestedLoginId" TEXT;

ALTER TABLE "GymApplication"
  ADD COLUMN IF NOT EXISTS "requestedLoginId" TEXT;

CREATE INDEX IF NOT EXISTS "AssociationApplication_requestedLoginId_idx"
  ON "AssociationApplication"("requestedLoginId");

CREATE INDEX IF NOT EXISTS "AssociationApplication_status_requestedLoginId_idx"
  ON "AssociationApplication"("status", "requestedLoginId");

CREATE INDEX IF NOT EXISTS "GymApplication_requestedLoginId_idx"
  ON "GymApplication"("requestedLoginId");

CREATE INDEX IF NOT EXISTS "GymApplication_status_requestedLoginId_idx"
  ON "GymApplication"("status", "requestedLoginId");
