-- GymApplication: store pending Supabase Auth user id created at signup (password never in app DB).
-- Additive only. Legacy invite columns remain for already-approved-but-not-activated applications.

ALTER TABLE "GymApplication"
  ADD COLUMN IF NOT EXISTS "pendingAuthUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "GymApplication_pendingAuthUserId_key"
  ON "GymApplication"("pendingAuthUserId")
  WHERE "pendingAuthUserId" IS NOT NULL;
