/**
 * 현장 계체 상세 workflow — 현장 확인 step 제거 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const detail = read(
  "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
);
assert.ok(!detail.includes("FieldStatusCheckInActions"));
assert.ok(!detail.includes('title="현장 확인"'));
assert.ok(detail.includes('title="계체"'));
assert.ok(detail.includes('title="경기 진행 여부"'));
assert.ok(detail.includes("실격 사유"));
assert.ok(detail.includes("결과 및 대진"));
assert.ok(detail.includes("관리"));
assert.ok(detail.includes("WeighInFailureResolutionForm"));
assert.ok(detail.includes("핸디캡"));
assert.ok(!detail.includes("수동 승인"));
assert.ok(!detail.includes("CheckInStatusBadge"));

const list = read(
  "src/components/domain/field-status/OrganizerFieldStatusListPane.tsx",
);
assert.ok(!list.includes("CheckInStatusBadge"));
assert.ok(list.includes("getFieldWeighInBadgeLabel"));
assert.ok(list.includes("getFieldProgressBadgeLabel"));
assert.ok(!list.includes("현장 미확인"));

const board = read(
  "src/components/domain/field-status/OrganizerFieldStatusBoard.tsx",
);
assert.ok(!board.includes("현장확인"));
assert.ok(board.includes("계체상태"));
assert.ok(board.includes("weighInFilter"));

const primary = read(
  "src/components/domain/field-status/FieldStatusPrimaryActions.tsx",
);
assert.ok(!primary.includes("수동 승인"));
assert.ok(!primary.includes("weighInManualPassFormAction"));
assert.ok(primary.includes("계체 통과"));
assert.ok(primary.includes("계체 실패"));

const eligibility = read("src/lib/field-eligibility.ts");
assert.ok(eligibility.includes("현장 확인(check-in pending)은 더 이상"));
assert.ok(eligibility.includes("핸디캡 경기"));
assert.ok(!eligibility.includes('eligibilityLabel: "수동 승인"'));
assert.ok(!eligibility.includes('eligibilityLabel: "현장 미확인"'));

console.log("verify:field-status-detail-workflow: OK");
console.log("verify:weigh-in-first-workflow: OK");
console.log("verify:no-check-in-step: OK");
console.log("verify:no-manual-weigh-in-approval: OK");
