/**
 * Admin member sport template management + grid UI static verifies.
 *   npx tsx scripts/verify-member-template-admin.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMemberFieldGridSpan,
  MEMBER_FORM_MAX_WIDTH_CLASS,
  memberGridSpanClass,
} from "../src/lib/gym-member-profile/grid";
import {
  assertCompatibleGymMemberFieldTypeChange,
  isCompatibleGymMemberFieldTypeChange,
} from "../src/lib/gym-member-profile/type-change";
import {
  validateMemberSportTemplateCode,
} from "../src/lib/gym-member-profile/sport-template-code";
import { validateGymMemberDynamicFieldDefinitions } from "../src/lib/gym-member-profile/fields";
import { getAdminNavGroups } from "../src/lib/navigation/admin-navigation";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchemaCodeString() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model MemberSportTemplate/);
  assert.match(schema, /code\s+String\s+@unique/);
  assert.doesNotMatch(schema, /enum MemberSportTemplateCode/);
  console.log("verify:member-template-admin-schema: OK");
}

function assertAdminNav() {
  const groups = getAdminNavGroups();
  const orgs = groups.find((g) => g.id === "orgs");
  assert.ok(
    orgs?.items.some((i) => i.href === "/admin/member-sport-templates"),
  );
  console.log("verify:member-template-admin-nav: OK");
}

function assertAdminRoutes() {
  const list = read(
    "src/app/(dashboard)/admin/member-sport-templates/page.tsx",
  );
  const detail = read(
    "src/app/(dashboard)/admin/member-sport-templates/[templateId]/page.tsx",
  );
  const create = read(
    "src/app/(dashboard)/admin/member-sport-templates/new/page.tsx",
  );
  assert.match(list, /회원관리 템플릿/);
  assert.match(detail, /AdminMemberSportTemplateBuilder/);
  assert.match(create, /AdminCreateMemberSportTemplateForm/);
  console.log("verify:member-template-admin-routes: OK");
}

function assertTypeSafety() {
  assert.equal(isCompatibleGymMemberFieldTypeChange("text", "textarea"), true);
  assert.equal(isCompatibleGymMemberFieldTypeChange("select", "radio"), true);
  assert.equal(isCompatibleGymMemberFieldTypeChange("text", "select"), false);
  assert.equal(isCompatibleGymMemberFieldTypeChange("boolean", "date"), false);
  assert.ok(assertCompatibleGymMemberFieldTypeChange("text", "select"));
  assert.equal(assertCompatibleGymMemberFieldTypeChange("text", "textarea"), null);

  const service = read(
    "src/lib/services/member-sport-template-admin.service.ts",
  );
  const custom = read(
    "src/lib/services/gym-member-custom-field.service.ts",
  );
  assert.match(service, /assertCompatibleGymMemberFieldTypeChange/);
  assert.match(custom, /assertCompatibleGymMemberFieldTypeChange/);
  assert.match(custom, /VALUE_EXISTS/);
  console.log("verify:member-template-admin-type-safety: OK");
}

function assertDeletePolicy() {
  const service = read(
    "src/lib/services/member-sport-template-admin.service.ts",
  );
  assert.match(service, /체육관에서 사용 중인 템플릿은 삭제할 수 없습니다/);
  assert.match(service, /countValues/);
  assert.doesNotMatch(service, /gymMember\.updateMany/);
  assert.doesNotMatch(service, /fighter/i);
  assert.doesNotMatch(service, /eventApplication/i);
  assert.doesNotMatch(service, /bracketMatch/i);
  console.log("verify:member-template-admin-delete-policy: OK");
}

function assertCodeValidation() {
  assert.equal(validateMemberSportTemplateCode("taekwondo").ok, true);
  assert.equal(validateMemberSportTemplateCode("bad code").ok, false);
  assert.equal(validateMemberSportTemplateCode("1ABC").ok, false);
  const ok = validateMemberSportTemplateCode("TAEKWONDO");
  assert.equal(ok.ok && ok.code, "TAEKWONDO");
  console.log("verify:member-template-admin-code: OK");
}

function assertGridSystem() {
  assert.equal(getMemberFieldGridSpan("text"), 4);
  assert.equal(getMemberFieldGridSpan("textarea"), 12);
  assert.equal(getMemberFieldGridSpan("boolean"), 3);
  assert.equal(getMemberFieldGridSpan("date"), 3);
  assert.equal(getMemberFieldGridSpan("number"), 3);
  assert.equal(getMemberFieldGridSpan("select"), 3);
  assert.equal(getMemberFieldGridSpan("radio"), 6);
  assert.match(MEMBER_FORM_MAX_WIDTH_CLASS, /max-w-\[78rem\]/);
  assert.match(memberGridSpanClass(3), /lg:col-span-3/);
  assert.match(memberGridSpanClass(12), /col-span-12/);

  const layout = read(
    "src/components/domain/gym-members/GymMemberFormLayout.tsx",
  );
  const common = read(
    "src/components/domain/gym-members/GymMemberCommonInfoSection.tsx",
  );
  assert.match(layout, /grid-cols-12/);
  assert.match(layout, /GymMemberFieldGrid/);
  assert.match(common, /GymMemberFieldGrid/);
  assert.doesNotMatch(common, /width:\s*25%/);
  assert.doesNotMatch(common, /w-1\/4/);
  console.log("verify:member-grid-ui: OK");
}

function assertSharedBuilder() {
  const card = read(
    "src/components/domain/gym-members/DynamicFieldEditorCard.tsx",
  );
  const gymBuilder = read(
    "src/components/domain/gym-members/GymMemberCustomFieldBuilder.tsx",
  );
  const adminBuilder = read(
    "src/components/domain/admin/AdminMemberSportTemplateBuilder.tsx",
  );
  assert.match(card, /DynamicFieldEditorCard/);
  assert.match(gymBuilder, /DynamicFieldEditorCard/);
  assert.match(adminBuilder, /DynamicFieldEditorCard/);
  assert.match(gymBuilder, /deleteGymMemberCustomFieldAction/);
  console.log("verify:member-template-admin-shared-builder: OK");
}

function assertCamelCaseStableKeysAllowed() {
  const fieldsSrc = read("src/lib/gym-member-profile/fields.ts");
  assert.match(fieldsSrc, /a-zA-Z0-9_/);
  assert.equal(
    validateGymMemberDynamicFieldDefinitions([
      {
        stableKey: "memberType",
        label: "회원 유형",
        type: "select",
        options: ["일반"],
      },
    ]),
    null,
  );
  console.log("verify:member-template-admin-camelcase-keys: OK");
}

assertSchemaCodeString();
assertAdminNav();
assertAdminRoutes();
assertTypeSafety();
assertDeletePolicy();
assertCodeValidation();
assertGridSystem();
assertSharedBuilder();
assertCamelCaseStableKeysAllowed();

console.log("verify:member-template-admin: ALL OK");
