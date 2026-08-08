/**
 * 회원 V3 gym-scope — 서비스/액션이 gym portal access를 거침
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  for (const file of [
    "src/lib/services/gym-member-group.service.ts",
    "src/lib/services/gym-member-locker.service.ts",
    "src/lib/services/gym-member-excel.service.ts",
  ]) {
    const src = readFileSync(file, "utf8");
    assert.match(src, /requireGymPortal(Read|Write)/);
  }

  const actions = readFileSync("src/features/gym-members/actions.ts", "utf8");
  assert.match(actions, /requireActorFromMutation/);
  assert.match(actions, /gymMemberGroupService/);
  assert.match(actions, /gymMemberLockerService/);
  assert.match(actions, /gymMemberExcelService/);

  console.log("verify:gym-member-gym-scope OK");
}

main();
