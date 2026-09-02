-- Additive: MemberSportTemplate.displayName for user-facing sport label SSOT.
-- Backfill from existing name (no Gym/Member/SPORT value writes).

ALTER TABLE "MemberSportTemplate"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT;

UPDATE "MemberSportTemplate"
SET "displayName" = "name"
WHERE "displayName" IS NULL OR btrim("displayName") = '';

ALTER TABLE "MemberSportTemplate"
  ALTER COLUMN "displayName" SET NOT NULL;
