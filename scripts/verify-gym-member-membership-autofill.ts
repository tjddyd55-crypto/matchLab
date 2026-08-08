/**
 * 이용권 선택 → 금액/종료일 자동입력 SSOT
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
  assert.match(create, /applyPlanAutofill/);
  assert.match(create, /setPaymentAmount\(String\(plan\.price\)\)/);
  assert.match(create, /addMembershipDuration/);

  const helper = readFileSync(
    "src/lib/gym-member/membership-duration.ts",
    "utf8",
  );
  assert.match(helper, /export function addMembershipDuration/);

  const service = readFileSync(
    "src/lib/services/gym-member.service.ts",
    "utf8",
  );
  assert.match(service, /addMembershipDuration/);
  assert.doesNotMatch(service, /function addDuration\(/);

  const days = addMembershipDuration(
    new Date(Date.UTC(2026, 5, 1)),
    GymMembershipDurationType.days,
    30,
  );
  assert.equal(days!.toISOString().slice(0, 10), "2026-07-01");

  console.log("verify:gym-member-membership-autofill OK");
}

main();
