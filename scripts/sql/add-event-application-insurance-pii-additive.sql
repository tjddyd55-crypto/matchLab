-- Additive EventApplication insurance PII + athlete profile (Development yamanote only)
-- Never DROP / TRUNCATE / SET NOT NULL / TYPE change

ALTER TABLE "EventApplication"
  ADD COLUMN IF NOT EXISTS "recordText" TEXT,
  ADD COLUMN IF NOT EXISTS "careerText" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceRrnCipher" BYTEA,
  ADD COLUMN IF NOT EXISTS "insuranceRrnIv" BYTEA,
  ADD COLUMN IF NOT EXISTS "insuranceRrnAuthTag" BYTEA,
  ADD COLUMN IF NOT EXISTS "insuranceRrnKeyVer" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceRrnMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceConsentSnapshot" JSONB;
