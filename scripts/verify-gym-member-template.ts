/**
 * Gym member sport template / custom field architecture static verifies.
 *   npm run verify:gym-member-template
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeGymMemberDynamicFields,
  validateGymMemberDynamicFieldDefinitions,
} from "../src/lib/gym-member-profile/fields";
import {
  gymMemberProfileValueToJson,
  parseGymMemberProfileValueFromForm,
} from "../src/lib/gym-member-profile/values";
import {
  gymProfileFormName,
  sportProfileFormName,
} from "../src/lib/gym-member-profile/form-names";
import { KICKBOXING_TEMPLATE_ID } from "../src/lib/gym-member-profile/types";
import { getGymPortalNavGroups } from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchema() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model MemberSportTemplate/);
  assert.match(schema, /model MemberSportTemplateField/);
  assert.match(schema, /model GymMemberCustomField/);
  assert.match(schema, /model GymMemberProfileValue/);
  assert.match(schema, /memberSportTemplateId/);
  assert.match(schema, /onDelete: SetNull/);
  assert.match(schema, /code\s+String\s+@unique/);
  console.log("verify:gym-member-template-schema: OK");
}

function assertMigration() {
  const sql = read(
    "prisma/migrations/20260902143000_gym_member_profile_template/migration.sql",
  );
  assert.match(sql, /INSERT INTO "MemberSportTemplate"/);
  assert.match(sql, /KICKBOXING/);
  assert.match(sql, /memberType/);
  assert.match(sql, /competitionExperienceNote/);
  assert.doesNotMatch(sql, /UPDATE "GymMember"/i);
  assert.doesNotMatch(sql, /UPDATE "Gym"/i);
  assert.doesNotMatch(sql, /UPDATE "Fighter"/i);
  console.log("verify:gym-member-template-migration: OK");
}

function assertKickboxingSeed() {
  assert.equal(KICKBOXING_TEMPLATE_ID, "cmskickboxingtpl001");
  console.log("verify:gym-member-template-kickboxing-id: OK");
}

function assertFormNames() {
  assert.equal(sportProfileFormName("stance"), "sport__stance");
  assert.equal(gymProfileFormName("lockerNo"), "gym__lockerNo");
  console.log("verify:gym-member-template-form-names: OK");
}

function assertValuePreservation() {
  const field = {
    stableKey: "trainingExperience",
    label: "운동 경력",
    type: "text" as const,
  };
  const parsed = parseGymMemberProfileValueFromForm("3년", field.type);
  assert.equal(gymMemberProfileValueToJson(parsed), "3년");

  const renamed = normalizeGymMemberDynamicFields([
    {
      stableKey: "training_experience",
      label: "킥복싱 운동 경력",
      type: "text",
    },
  ]);
  assert.equal(renamed[0]?.stableKey, "training_experience");
  assert.equal(
    validateGymMemberDynamicFieldDefinitions(renamed),
    null,
  );

  const inactive = normalizeGymMemberDynamicFields([
    {
      stableKey: "legacyField",
      label: "구 항목",
      type: "text",
      active: false,
    },
  ]);
  assert.equal(inactive[0]?.active, false);
  console.log("verify:gym-member-template-value-preservation: OK");
}

function assertActionsNoForeignWrites() {
  const actions = read("src/features/gym-members/actions.ts");
  const profileActions = read("src/features/gym-members/profile-actions.ts");
  assert.match(actions, /gymMemberProfileService/);
  assert.match(actions, /saveProfileValuesForMember/);
  assert.doesNotMatch(actions, /fighter\.update/i);
  assert.doesNotMatch(actions, /eventApplication/i);
  assert.doesNotMatch(actions, /bracketMatch/i);
  assert.doesNotMatch(profileActions, /fighter/i);
  console.log("verify:gym-member-template-actions: OK");
}

function assertUiSections() {
  const create = read("src/components/domain/gym-members/GymMemberCreateForm.tsx");
  const edit = read("src/components/domain/gym-members/GymMemberEditForm.tsx");
  assert.match(create, /GymMemberCommonInfoSection/);
  assert.match(create, /GymMemberMultiSportSections/);
  assert.match(create, /GymMemberCustomProfileSection/);
  assert.match(edit, /GymMemberCommonInfoSection/);
  assert.match(edit, /GymMemberMultiSportSections/);
  console.log("verify:gym-member-template-ui-sections: OK");
}

function assertNavigation() {
  const groups = getGymPortalNavGroups("owner");
  const memberGroup = groups.find((g) => g.id === "members");
  assert.ok(memberGroup?.items.some((i) => i.href === "/gym/member-custom-fields"));
  console.log("verify:gym-member-template-navigation: OK");
}

function assertGymIsolation() {
  const repo = read("src/lib/repositories/gym-member-profile.repository.ts");
  assert.match(repo, /gymId/);
  assert.match(repo, /listForGym/);
  console.log("verify:gym-member-template-gym-isolation: OK");
}

assertSchema();
assertMigration();
assertKickboxingSeed();
assertFormNames();
assertValuePreservation();
assertActionsNoForeignWrites();
assertUiSections();
assertNavigation();
assertGymIsolation();

console.log("verify:gym-member-template: ALL OK");
