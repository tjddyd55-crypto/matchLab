-- Gym member profile template (Phase 1: KICKBOXING) — additive only

CREATE TYPE "MemberSportTemplateCode" AS ENUM ('KICKBOXING');

CREATE TYPE "GymMemberProfileValueSource" AS ENUM ('SPORT', 'GYM');

CREATE TYPE "GymMemberDynamicFieldType" AS ENUM (
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'boolean'
);

CREATE TABLE "MemberSportTemplate" (
  "id" TEXT NOT NULL,
  "code" "MemberSportTemplateCode" NOT NULL,
  "name" TEXT NOT NULL,
  "sportType" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberSportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberSportTemplate_code_key" ON "MemberSportTemplate"("code");
CREATE INDEX "MemberSportTemplate_active_idx" ON "MemberSportTemplate"("active");

CREATE TABLE "MemberSportTemplateField" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "GymMemberDynamicFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "placeholder" TEXT,
  "helpText" TEXT,
  "optionsJson" JSONB,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberSportTemplateField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberSportTemplateField_templateId_stableKey_key"
  ON "MemberSportTemplateField"("templateId", "stableKey");
CREATE INDEX "MemberSportTemplateField_templateId_displayOrder_idx"
  ON "MemberSportTemplateField"("templateId", "displayOrder");
CREATE INDEX "MemberSportTemplateField_templateId_active_idx"
  ON "MemberSportTemplateField"("templateId", "active");

ALTER TABLE "MemberSportTemplateField"
  ADD CONSTRAINT "MemberSportTemplateField_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MemberSportTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GymMemberCustomField" (
  "id" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "GymMemberDynamicFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "placeholder" TEXT,
  "helpText" TEXT,
  "optionsJson" JSONB,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GymMemberCustomField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymMemberCustomField_gymId_stableKey_key"
  ON "GymMemberCustomField"("gymId", "stableKey");
CREATE INDEX "GymMemberCustomField_gymId_displayOrder_idx"
  ON "GymMemberCustomField"("gymId", "displayOrder");
CREATE INDEX "GymMemberCustomField_gymId_active_idx"
  ON "GymMemberCustomField"("gymId", "active");

ALTER TABLE "GymMemberCustomField"
  ADD CONSTRAINT "GymMemberCustomField_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GymMemberProfileValue" (
  "id" TEXT NOT NULL,
  "gymMemberId" TEXT NOT NULL,
  "sourceType" "GymMemberProfileValueSource" NOT NULL,
  "stableKey" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "sportTemplateFieldId" TEXT,
  "gymCustomFieldId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GymMemberProfileValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymMemberProfileValue_gymMemberId_sourceType_stableKey_key"
  ON "GymMemberProfileValue"("gymMemberId", "sourceType", "stableKey");
CREATE INDEX "GymMemberProfileValue_gymMemberId_idx" ON "GymMemberProfileValue"("gymMemberId");
CREATE INDEX "GymMemberProfileValue_sportTemplateFieldId_idx" ON "GymMemberProfileValue"("sportTemplateFieldId");
CREATE INDEX "GymMemberProfileValue_gymCustomFieldId_idx" ON "GymMemberProfileValue"("gymCustomFieldId");

ALTER TABLE "GymMemberProfileValue"
  ADD CONSTRAINT "GymMemberProfileValue_gymMemberId_fkey"
  FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GymMemberProfileValue"
  ADD CONSTRAINT "GymMemberProfileValue_sportTemplateFieldId_fkey"
  FOREIGN KEY ("sportTemplateFieldId") REFERENCES "MemberSportTemplateField"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymMemberProfileValue"
  ADD CONSTRAINT "GymMemberProfileValue_gymCustomFieldId_fkey"
  FOREIGN KEY ("gymCustomFieldId") REFERENCES "GymMemberCustomField"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Gym" ADD COLUMN "memberSportTemplateId" TEXT;

CREATE INDEX "Gym_memberSportTemplateId_idx" ON "Gym"("memberSportTemplateId");

ALTER TABLE "Gym"
  ADD CONSTRAINT "Gym_memberSportTemplateId_fkey"
  FOREIGN KEY ("memberSportTemplateId") REFERENCES "MemberSportTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: KICKBOXING system template (no Gym/Member data UPDATE)
INSERT INTO "MemberSportTemplate" (
  "id", "code", "name", "sportType", "active", "version", "createdAt", "updatedAt"
) VALUES (
  'cmskickboxingtpl001',
  'KICKBOXING',
  '킥복싱',
  'kickboxing',
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "MemberSportTemplateField" (
  "id", "templateId", "stableKey", "label", "type", "required", "placeholder", "helpText", "optionsJson", "displayOrder", "active", "createdAt", "updatedAt"
) VALUES
  ('cmskickfld001', 'cmskickboxingtpl001', 'memberType', '회원 유형', 'select', false, NULL, NULL, '["일반","선수"]', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld002', 'cmskickboxingtpl001', 'weightClass', '체급', 'text', false, '예: -57kg', NULL, NULL, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld003', 'cmskickboxingtpl001', 'trainingExperience', '운동 경력', 'text', false, '예: 3년', NULL, NULL, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld004', 'cmskickboxingtpl001', 'stance', '주손/스탠스', 'select', false, NULL, NULL, '["Orthodox","Southpaw","Switch"]', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld005', 'cmskickboxingtpl001', 'sparringAvailable', '스파링 가능 여부', 'boolean', false, NULL, NULL, NULL, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld006', 'cmskickboxingtpl001', 'competitionParticipation', '대회 출전 여부', 'boolean', false, NULL, NULL, NULL, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmskickfld007', 'cmskickboxingtpl001', 'competitionExperienceNote', '기존/외부 경기 경력', 'textarea', false, '회원관리용 참고 메모 (공식 전적 SSOT 아님)', 'Fighter Career·MatchResult와 별도입니다.', NULL, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
