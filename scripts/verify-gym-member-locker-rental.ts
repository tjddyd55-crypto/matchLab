/**
 * 사물함 이용 이력 — 스키마/서비스/UI SSOT
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model GymMemberLockerRental /);
  assert.match(schema, /lockerLabel/);
  assert.match(schema, /endedAt/);
  assert.match(schema, /enum GymSalesCategory[\s\S]*locker/);

  const service = readFileSync(
    "src/lib/services/gym-member-locker.service.ts",
    "utf8",
  );
  assert.match(service, /extendRental/);
  assert.match(service, /endRental/);
  assert.match(service, /GymSalesCategory\.locker/);
  assert.match(service, /assertNoLabelOverlap|lockerRangesOverlap/);

  const helper = readFileSync(
    "src/lib/gym-member/locker-label.ts",
    "utf8",
  );
  assert.match(helper, /normalizeLockerLabel/);
  assert.match(helper, /lockerRangesOverlap/);

  const panel = readFileSync(
    "src/components/domain/gym-members/GymMemberLockerPanel.tsx",
    "utf8",
  );
  assert.match(panel, /연장/);
  assert.match(panel, /종료/);
  assert.match(panel, /이용 이력/);

  console.log("verify:gym-member-locker-rental OK");
}

main();
