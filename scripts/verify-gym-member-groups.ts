/**
 * 회원 그룹 M:N — 스키마/서비스/페이지 SSOT
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model GymMemberGroup /);
  assert.match(schema, /model GymMemberGroupAssignment /);
  assert.match(schema, /@@unique\(\[gymMemberId, groupId\]\)/);

  const service = readFileSync(
    "src/lib/services/gym-member-group.service.ts",
    "utf8",
  );
  assert.match(service, /replaceMemberGroups|setMemberGroups/);
  assert.match(service, /findActiveByName/);

  const page = readFileSync(
    "src/app/(dashboard)/gym/member-groups/page.tsx",
    "utf8",
  );
  assert.match(page, /GymMemberGroupManager/);

  const nav = readFileSync(
    "src/lib/navigation/gym-portal-navigation.ts",
    "utf8",
  );
  assert.match(nav, /\/gym\/member-groups/);

  const filter = readFileSync(
    "src/components/domain/gym-members/MemberFilterBar.tsx",
    "utf8",
  );
  assert.match(filter, /groupId/);

  console.log("verify:gym-member-groups OK");
}

main();
