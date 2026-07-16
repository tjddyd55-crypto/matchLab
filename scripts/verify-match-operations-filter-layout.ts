/**
 * Static checks: match operations list filter card removed; top chips only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const board = read(
  "src/components/domain/operation/OrganizerOperationBoard.tsx",
);
assert.ok(!board.includes("organizerOperationListHeaderClass"));
assert.ok(!board.includes("경기 목록"));
assert.ok(!board.includes("건 표시"));
assert.ok(!board.includes("statusFilter"));
assert.ok(!board.includes("FILTER_OPTIONS"));
assert.ok(board.includes("OperationCompactSummaryBar"));
assert.ok(board.includes("summaryFilter"));
assert.ok(board.includes("OperationMatchListPane"));

const bar = read(
  "src/components/domain/operation/OperationCompactSummaryBar.tsx",
);
assert.ok(bar.includes("result_pending"));
assert.ok(bar.includes("result_done"));
assert.ok(bar.includes("전체"));
assert.ok(bar.includes("대기"));

console.log("verify:match-operations-filter-layout: OK");
