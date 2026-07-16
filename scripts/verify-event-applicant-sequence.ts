/**
 * Static checks: applicant sequence + compact filter, no quick chips.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  displaySequenceNumber,
  paginatedSequenceNumber,
} from "../src/lib/ui/list-sequence";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(displaySequenceNumber(0), 1);
assert.equal(displaySequenceNumber(2, 10), 13);
assert.equal(paginatedSequenceNumber(0, 2, 20), 21);

const board = read(
  "src/components/domain/applications/OrganizerApplicationsBoard.tsx",
);
assert.ok(!board.includes("빠른 상태 필터"));
assert.ok(!board.includes("MatchonTabs"));
assert.ok(board.includes("sequenceStart"));
assert.ok(board.includes("OrganizerApplicationsSummaryCards"));

const bar = read(
  "src/components/domain/applications/OrganizerApplicationsFilterBar.tsx",
);
assert.ok(bar.includes("compactApplicantFilterBarClass"));
assert.ok(bar.includes('aria-label="선수 검색"'));
assert.ok(bar.includes('aria-label="신청상태 필터"'));
assert.ok(!bar.includes("선수 이름 검색"));

const table = read(
  "src/components/domain/applications/OrganizerApplicationsTable.tsx",
);
assert.ok(table.includes("순번"));
assert.ok(table.includes("displaySequenceNumber"));

console.log("verify:event-applicant-sequence: OK");
