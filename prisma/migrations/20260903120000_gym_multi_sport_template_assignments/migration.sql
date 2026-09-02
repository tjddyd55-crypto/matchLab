-- Additive multi-sport template assignments.
-- Legacy Gym.memberSportTemplateId is preserved (no DROP).

-- Gym ↔ MemberSportTemplate
CREATE TABLE "GymSportTemplateAssignment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSportTemplateAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymSportTemplateAssignment_gymId_templateId_key"
  ON "GymSportTemplateAssignment"("gymId", "templateId");
CREATE INDEX "GymSportTemplateAssignment_gymId_isActive_idx"
  ON "GymSportTemplateAssignment"("gymId", "isActive");
CREATE INDEX "GymSportTemplateAssignment_templateId_isActive_idx"
  ON "GymSportTemplateAssignment"("templateId", "isActive");

ALTER TABLE "GymSportTemplateAssignment"
  ADD CONSTRAINT "GymSportTemplateAssignment_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymSportTemplateAssignment"
  ADD CONSTRAINT "GymSportTemplateAssignment_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MemberSportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic copy from legacy Gym.memberSportTemplateId (1:1, no guesswork)
INSERT INTO "GymSportTemplateAssignment" ("id", "gymId", "templateId", "isActive", "createdAt", "updatedAt")
SELECT
  'gst_' || "id",
  "id",
  "memberSportTemplateId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Gym"
WHERE "memberSportTemplateId" IS NOT NULL
ON CONFLICT ("gymId", "templateId") DO NOTHING;

-- GymApplication sport selection snapshot
CREATE TABLE "GymApplicationSportTemplate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateCodeSnapshot" TEXT NOT NULL,
    "templateNameSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymApplicationSportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymApplicationSportTemplate_applicationId_templateId_key"
  ON "GymApplicationSportTemplate"("applicationId", "templateId");
CREATE INDEX "GymApplicationSportTemplate_applicationId_idx"
  ON "GymApplicationSportTemplate"("applicationId");
CREATE INDEX "GymApplicationSportTemplate_templateId_idx"
  ON "GymApplicationSportTemplate"("templateId");

ALTER TABLE "GymApplicationSportTemplate"
  ADD CONSTRAINT "GymApplicationSportTemplate_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "GymApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymApplicationSportTemplate"
  ADD CONSTRAINT "GymApplicationSportTemplate_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MemberSportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- GymMember ↔ MemberSportTemplate
CREATE TABLE "GymMemberSportTemplateAssignment" (
    "id" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMemberSportTemplateAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymMemberSportTemplateAssignment_gymMemberId_templateId_key"
  ON "GymMemberSportTemplateAssignment"("gymMemberId", "templateId");
CREATE INDEX "GymMemberSportTemplateAssignment_gymMemberId_isActive_idx"
  ON "GymMemberSportTemplateAssignment"("gymMemberId", "isActive");
CREATE INDEX "GymMemberSportTemplateAssignment_templateId_isActive_idx"
  ON "GymMemberSportTemplateAssignment"("templateId", "isActive");

ALTER TABLE "GymMemberSportTemplateAssignment"
  ADD CONSTRAINT "GymMemberSportTemplateAssignment_gymMemberId_fkey"
  FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberSportTemplateAssignment"
  ADD CONSTRAINT "GymMemberSportTemplateAssignment_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MemberSportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic member sport assignments from existing SPORT values with known field→template
INSERT INTO "GymMemberSportTemplateAssignment" ("id", "gymMemberId", "templateId", "isActive", "createdAt", "updatedAt")
SELECT
  'gms_' || md5(v."gymMemberId" || ':' || f."templateId"),
  v."gymMemberId",
  f."templateId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "gymMemberId", "sportTemplateFieldId"
  FROM "GymMemberProfileValue"
  WHERE "sourceType" = 'SPORT'
    AND "sportTemplateFieldId" IS NOT NULL
) v
INNER JOIN "MemberSportTemplateField" f ON f."id" = v."sportTemplateFieldId"
ON CONFLICT ("gymMemberId", "templateId") DO NOTHING;

-- Multi-sport value uniqueness: field-id based (no value rewrite)
DROP INDEX IF EXISTS "GymMemberProfileValue_gymMemberId_sourceType_stableKey_key";

CREATE UNIQUE INDEX "GymMemberProfileValue_member_sportField_uidx"
  ON "GymMemberProfileValue"("gymMemberId", "sportTemplateFieldId")
  WHERE "sportTemplateFieldId" IS NOT NULL;

CREATE UNIQUE INDEX "GymMemberProfileValue_member_gymField_uidx"
  ON "GymMemberProfileValue"("gymMemberId", "gymCustomFieldId")
  WHERE "gymCustomFieldId" IS NOT NULL;

CREATE UNIQUE INDEX "GymMemberProfileValue_orphan_stable_uidx"
  ON "GymMemberProfileValue"("gymMemberId", "sourceType", "stableKey")
  WHERE "sportTemplateFieldId" IS NULL AND "gymCustomFieldId" IS NULL;

CREATE INDEX "GymMemberProfileValue_gymMemberId_sourceType_stableKey_idx"
  ON "GymMemberProfileValue"("gymMemberId", "sourceType", "stableKey");
