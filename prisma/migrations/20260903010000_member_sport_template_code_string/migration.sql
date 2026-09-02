-- Convert MemberSportTemplate.code from enum to TEXT for extensible sport templates.
ALTER TABLE "MemberSportTemplate" ALTER COLUMN "code" TYPE TEXT USING ("code"::text);
DROP TYPE IF EXISTS "MemberSportTemplateCode";
