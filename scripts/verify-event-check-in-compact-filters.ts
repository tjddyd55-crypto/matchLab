/**
 * Static checks: check-in compact filters + master-detail.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const board = read(
  "src/components/domain/field-status/OrganizerFieldStatusBoard.tsx",
);
assert.ok(!board.includes("빠른 상태 필터"), "quick chips label removed");
assert.ok(!board.includes("MatchonTabs"), "MatchonTabs removed from check-in");
assert.ok(!board.includes("QUICK_FILTER_TABS"), "QUICK_FILTER_TABS removed");
assert.ok(
  board.includes("compactApplicantFilterBarClass"),
  "compact filter bar used",
);
assert.ok(board.includes('aria-label="선수 검색"'));
assert.ok(board.includes('aria-label="체육관 필터"'));
assert.ok(board.includes('aria-label="경기구분 필터"'));
assert.ok(board.includes('aria-label="계체 상태 필터"'));
assert.ok(!board.includes('aria-label="현장 확인 필터"'));
assert.ok(board.includes("FieldStatusSummaryCards"), "summary cards kept");
assert.ok(board.includes("OrganizerFieldStatusListPane"));
assert.ok(board.includes("OrganizerFieldStatusDetailPane"));
assert.ok(board.includes("organizerOperationWorkspaceClass"));
assert.ok(!board.includes("OrganizerFieldStatusTable"));

assert.ok(
  existsSync(
    path.join(
      ROOT,
      "src/components/domain/field-status/OrganizerFieldStatusListPane.tsx",
    ),
  ),
);
assert.ok(
  existsSync(
    path.join(
      ROOT,
      "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
    ),
  ),
);

const list = read(
  "src/components/domain/field-status/OrganizerFieldStatusListPane.tsx",
);
assert.ok(list.includes("displaySequenceNumber"));
assert.ok(list.includes("aria-selected"));

const detail = read(
  "src/components/domain/field-status/OrganizerFieldStatusDetailPane.tsx",
);
assert.ok(detail.includes("WeighInWeightInput"));
assert.ok(detail.includes("WeighInFailureResolutionForm"));
assert.ok(detail.includes("DisqualificationReasonForm"));
assert.ok(!detail.includes("FieldStatusCheckInActions"));

console.log("verify:event-check-in-compact-filters: OK");
