/**
 * Static verify: gym multi-sport member templates.
 *   npx tsx scripts/verify-gym-multi-sport.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dedupeTemplateIds } from "../src/lib/gym-member-profile/multi-sport";
import {
  sportProfileFormNameForTemplate,
  sportProfileFormName,
} from "../src/lib/gym-member-profile/form-names";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model GymSportTemplateAssignment/);
  assert.match(schema, /model GymApplicationSportTemplate/);
  assert.match(schema, /model GymMemberSportTemplateAssignment/);
  assert.match(schema, /memberSportTemplateId/);
  assert.match(schema, /GymLegacyMemberSportTemplate/);
  assert.doesNotMatch(
    schema,
    /@@unique\(\[gymMemberId, sourceType, stableKey\]\)/,
  );

  const migration = read(
    "prisma/migrations/20260903120000_gym_multi_sport_template_assignments/migration.sql",
  );
  assert.match(migration, /GymSportTemplateAssignment/);
  assert.match(migration, /INSERT INTO "GymSportTemplateAssignment"/);
  assert.match(migration, /memberSportTemplateId" IS NOT NULL/);
  assert.doesNotMatch(migration, /DROP COLUMN "memberSportTemplateId"/);
  assert.doesNotMatch(migration, /UPDATE "GymMember"/);
  assert.doesNotMatch(migration, /UPDATE "Fighter"/);
  assert.doesNotMatch(migration, /UPDATE "EventApplication"/);
  assert.doesNotMatch(migration, /UPDATE "BracketMatch"/);
  assert.doesNotMatch(migration, /UPDATE "MatchResult"/);
  assert.doesNotMatch(migration, /UPDATE "GymMemberProfileValue"/);

  const service = read("src/lib/services/gym-member-profile.service.ts");
  assert.match(service, /sportTemplates/);
  assert.match(service, /resolveGymActiveSportTemplates/);
  assert.match(service, /syncMemberSportTemplates/);
  assert.match(service, /saveGymSportTemplateAssignments/);
  assert.doesNotMatch(service, /prisma\.fighter\.update/);
  assert.doesNotMatch(service, /eventApplication\.update/);
  assert.doesNotMatch(service, /bracketMatch\.update/);

  const appService = read("src/lib/services/gym-application.service.ts");
  assert.match(appService, /sportTemplateIds/);
  assert.match(appService, /gymApplicationSportTemplateRepository/);
  assert.match(appService, /gymSportTemplateAssignmentRepository/);
  assert.match(appService, /replaceSelections/);

  const admin = read("src/lib/services/member-sport-template-admin.service.ts");
  assert.match(admin, /gymAssignments/);
  assert.doesNotMatch(admin, /_count\.gyms/);

  const joinForm = read(
    "src/components/domain/gym-join/GymJoinApplicationForm.tsx",
  );
  assert.match(joinForm, /운영 종목/);
  assert.match(joinForm, /sportTemplateIds/);

  const multi = read(
    "src/components/domain/gym-members/GymMemberMultiSportSections.tsx",
  );
  assert.match(multi, /회원 종목/);
  assert.match(multi, /memberSportTemplateIds/);

  const settings = read(
    "src/components/domain/gym-members/GymSportTemplateSettingsPanel.tsx",
  );
  assert.match(settings, /사용 종목/);
  assert.match(settings, /saveGymSportTemplateAssignmentsAction/);

  assert.equal(
    sportProfileFormNameForTemplate("tpl1", "weight"),
    "sport__tpl1__weight",
  );
  assert.equal(sportProfileFormName("weight"), "sport__weight");
  assert.deepEqual(dedupeTemplateIds(["a", "a", " b ", ""]), ["a", "b"]);

  console.log("verify:gym-multi-sport: ALL OK");
}

main();
