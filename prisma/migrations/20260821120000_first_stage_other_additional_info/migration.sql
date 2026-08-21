-- Additive: 1차 OTHER 체급(nullable divisionId) + 2차 추가정보 요청 필드
-- Development yamanote only. Do not apply to Production/yamabiko in this phase.

CREATE TYPE "DivisionSelectionType" AS ENUM ('REGISTERED', 'OTHER');
CREATE TYPE "AdditionalInfoStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "AdditionalInfoRecipientType" AS ENUM ('ATHLETE', 'GUARDIAN');

ALTER TABLE "EventApplication" ALTER COLUMN "divisionId" DROP NOT NULL;

ALTER TABLE "EventApplication"
  ADD COLUMN IF NOT EXISTS "divisionSelectionType" "DivisionSelectionType" NOT NULL DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS "requestedDivisionText" TEXT,
  ADD COLUMN IF NOT EXISTS "participantAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "participantAddressDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoGuardianRelation" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoSignatureObjectKey" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoStatus" "AdditionalInfoStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN IF NOT EXISTS "additionalInfoRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "additionalInfoLastSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "additionalInfoCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "additionalInfoRecipientType" "AdditionalInfoRecipientType",
  ADD COLUMN IF NOT EXISTS "additionalInfoSendStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoRecipientMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "additionalInfoTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "EventApplication_additionalInfoTokenHash_key"
  ON "EventApplication"("additionalInfoTokenHash");

CREATE INDEX IF NOT EXISTS "EventApplication_additionalInfoStatus_idx"
  ON "EventApplication"("additionalInfoStatus");

CREATE INDEX IF NOT EXISTS "EventApplication_divisionSelectionType_idx"
  ON "EventApplication"("divisionSelectionType");
