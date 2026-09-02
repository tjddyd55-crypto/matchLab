/**
 * Static verify: default sport templates + displayName SSOT + textarea defaults.
 *   npx tsx scripts/verify-default-sport-templates.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  memberSportTemplateDisplayName,
  validateMemberSportDisplayName,
} from "../src/lib/gym-member-profile/display-name";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /displayName\s+String/);
  assert.match(schema, /model MemberSportTemplate/);

  const migration = read(
    "prisma/migrations/20260903140000_member_sport_template_display_name/migration.sql",
  );
  assert.match(migration, /ADD COLUMN.*displayName/s);
  assert.doesNotMatch(migration, /UPDATE "GymMember"/);
  assert.doesNotMatch(migration, /DELETE FROM "MemberSportTemplate"/);

  const seed = read("scripts/seed-default-sport-templates.ts");
  assert.match(seed, /BOXING/);
  assert.match(seed, /TAEKWONDO/);
  assert.match(seed, /MMA/);
  assert.match(seed, /킥복싱 기본 회원정보/);
  assert.match(seed, /Does NOT assign templates to Gyms/);
  assert.doesNotMatch(seed, /gymSportTemplateAssignment\.create/);

  const join = read("src/app/(onboarding)/join/gym/page.tsx");
  assert.match(join, /memberSportTemplateDisplayName/);

  const multi = read(
    "src/components/domain/gym-members/GymMemberMultiSportSections.tsx",
  );
  assert.match(multi, /memberSportTemplateDisplayName/);

  const sections = read(
    "src/components/domain/gym-members/GymMemberProfileSections.tsx",
  );
  assert.match(sections, /memberSportTemplateDisplayName/);

  const create = read(
    "src/components/domain/admin/AdminCreateMemberSportTemplateForm.tsx",
  );
  assert.match(create, /표시명/);
  assert.match(create, /displayName/);
  assert.match(
    create,
    /체육관 가입·회원관리 화면에 표시되는 종목명입니다/,
  );

  const editor = read(
    "src/components/domain/gym-members/DynamicFieldEditorCard.tsx",
  );
  assert.match(editor, /matchonFieldTextareaClass|formControlTextareaClass/);
  assert.match(editor, /rows=\{4\}/);

  const fieldInput = read(
    "src/components/domain/gym-members/GymMemberDynamicFieldInput.tsx",
  );
  assert.match(fieldInput, /rows=\{4\}/);
  assert.match(
    fieldInput,
    /matchonFieldTextareaClass|formControlTextareaClass/,
  );

  assert.equal(
    memberSportTemplateDisplayName({
      name: "킥복싱 테스트 버전 2",
      displayName: "킥복싱",
    }),
    "킥복싱",
  );
  assert.equal(validateMemberSportDisplayName("").ok, false);
  assert.equal(validateMemberSportDisplayName("킥복싱").ok, true);

  console.log("verify:default-sport-templates: ALL OK");
}

main();
