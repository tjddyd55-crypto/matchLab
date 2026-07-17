/**
 * 현장 확인 master-detail 정적 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const board = read(
  "src/components/domain/field-status/OrganizerFieldStatusBoard.tsx",
);
assert.ok(board.includes("preferredApplicationId"));
assert.ok(board.includes("selectedApplicationId"));
assert.ok(board.includes("mobileShowDetail"));
assert.ok(board.includes("목록으로") === false); // back is in detail pane
assert.ok(board.includes("OrganizerFieldStatusListPane"));
assert.ok(board.includes("OrganizerFieldStatusDetailPane"));

const detail = read(
  "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
);
assert.ok(detail.includes("FieldStatusResetButton"));
assert.ok(detail.includes("FieldFinalResultCell"));
assert.ok(detail.includes("경기 운영에서 보기"));

const list = read(
  "src/components/domain/field-status/OrganizerFieldStatusListPane.tsx",
);
assert.ok(!list.includes("WeighInWeightInput"));
assert.ok(!list.includes("WeighInFailureResolutionForm"));

console.log("verify:event-check-in-master-detail: OK");
