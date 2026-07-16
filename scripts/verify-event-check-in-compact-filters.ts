/**
 * Static checks: check-in compact filters, no quick status chips.
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
assert.ok(board.includes('aria-label="현장 확인 필터"'));
assert.ok(board.includes("sequenceStart"));
assert.ok(board.includes("FieldStatusSummaryCards"), "summary cards kept");

const table = read(
  "src/components/domain/field-status/OrganizerFieldStatusTable.tsx",
);
assert.ok(table.includes(">순번<") || table.includes("순번</th>"));
assert.ok(table.includes("displaySequenceNumber"));
assert.ok(table.includes("ListSequenceMobilePrefix"));

console.log("verify:event-check-in-compact-filters: OK");
