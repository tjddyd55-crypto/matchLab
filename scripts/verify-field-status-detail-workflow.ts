/**
 * 현장 확인 상세 workflow 순서·중복 badge 제거 검증.
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
assert.ok(detail.includes("1. 현장 확인") || detail.includes('title="현장 확인"'));
assert.ok(detail.includes('title="계체"'));
assert.ok(detail.includes('title="경기 진행 여부"'));
assert.ok(detail.includes("불참·실격 사유"));
assert.ok(detail.includes("결과 및 대진"));
assert.ok(detail.includes("관리"));
assert.ok(detail.includes("FieldStatusResetButton"));
assert.ok(detail.includes("WeighInFailureResolutionForm"));
assert.ok(detail.includes("showDisqualify={false}"));
assert.ok(!detail.includes("CheckInStatusBadge"));
assert.ok(!detail.includes("WeighInStatusBadge"));
assert.ok(!detail.includes("EligibilityBadge"));

const list = read(
  "src/components/domain/field-status/OrganizerFieldStatusListPane.tsx",
);
assert.ok(list.includes("getFieldStatusListCardClass"));
assert.ok(list.includes("CheckInStatusBadge"));
assert.ok(list.includes("WeighInStatusBadge"));
assert.ok(!list.includes("EligibilityBadge"));

const helper = read("src/lib/field-status-list-display.ts");
assert.ok(helper.includes("getFieldStatusListTone"));
assert.ok(helper.includes("shouldShowFieldReasonSection"));
assert.ok(helper.includes("dq_noshow"));

const primary = read(
  "src/components/domain/field-status/FieldStatusPrimaryActions.tsx",
);
assert.ok(primary.includes("수동 승인"));
assert.ok(primary.includes("weighInManualPassFormAction"));

console.log("verify:field-status-detail-workflow: OK");
