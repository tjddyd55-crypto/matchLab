-- EventApplication: external affiliation without MATCHON Gym account
-- gymId nullable + gymNameSnapshot additive. Production placeholder Gym은 삭제하지 않음.

ALTER TABLE "EventApplication"
  ALTER COLUMN "gymId" DROP NOT NULL;

ALTER TABLE "EventApplication"
  DROP CONSTRAINT IF EXISTS "EventApplication_gymId_fkey";

ALTER TABLE "EventApplication"
  ADD CONSTRAINT "EventApplication_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventApplication"
  ADD COLUMN IF NOT EXISTS "gymNameSnapshot" TEXT;

-- 기존 row: gymSnapshot.name → gymNameSnapshot 백필 (placeholder 이름은 채우지 않음)
UPDATE "EventApplication" ea
SET "gymNameSnapshot" = NULLIF(TRIM(ea."gymSnapshot"->>'name'), '')
WHERE ea."gymNameSnapshot" IS NULL
  AND ea."gymSnapshot" IS NOT NULL
  AND COALESCE(TRIM(ea."gymSnapshot"->>'name'), '') <> ''
  AND TRIM(ea."gymSnapshot"->>'name') NOT LIKE 'MATCHON 외부등록%';
