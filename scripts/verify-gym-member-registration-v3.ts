/**
 * 회원등록 V3 — 폼/자동입력/사물함 토글 문자열 SSOT
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addMembershipDuration } from "../src/lib/gym-member/membership-duration";
import { GymMembershipDurationType } from "../src/lib/enums";

function main() {
  const create = readFileSync(
    "src/components/domain/gym-members/GymMemberCreateForm.tsx",
    "utf8",
  );
  assert.match(create, /lg:grid-cols-2/);
  assert.match(create, /보호자\(비상연락처\)/);
  assert.match(create, /addMembershipDuration/);
  assert.match(create, /lockerEnabled/);
  assert.match(create, /groupIds/);
  assert.doesNotMatch(create, /name="primarySport"/);
  assert.doesNotMatch(create, /name="emergencyContactName"/);

  const edit = readFileSync(
    "src/components/domain/gym-members/GymMemberEditForm.tsx",
    "utf8",
  );
  assert.match(edit, /보호자\(비상연락처\)/);
  assert.match(edit, /groupIds/);

  const start = new Date(Date.UTC(2026, 0, 15));
  const ends = addMembershipDuration(
    start,
    GymMembershipDurationType.months,
    1,
  );
  assert.ok(ends);
  assert.equal(ends!.toISOString().slice(0, 10), "2026-02-15");

  console.log("verify:gym-member-registration-v3 OK");
}

main();
