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
assert.ok(bar.includes("compactApplicantFilterRowClass"));
assert.ok(bar.includes('aria-label="선수 검색"'));
assert.ok(bar.includes('aria-label="신청상태 필터"'));
assert.ok(!bar.includes("선수 이름 검색"));
assert.ok(bar.includes("CompactFilterResetButton"));

const filterSsot = read(
  "src/components/domain/shared/CompactApplicantFilterBar.tsx",
);
assert.ok(filterSsot.includes("max-[1365px]:flex-wrap"));

const summary = read(
  "src/components/domain/applications/OrganizerApplicationsSummaryCards.tsx",
);
assert.ok(summary.includes("MatchonStatCardButton"));
assert.ok(summary.includes("eventManagementStatGridClass"));
assert.ok(!summary.includes("CompactKpiButton"));

const kpiSsot = read("src/lib/ui/event-management-ui.ts");
assert.ok(kpiSsot.includes("h-[56px]"));
assert.ok(kpiSsot.includes("rounded-[10px]"));
assert.ok(kpiSsot.includes("text-lg font-bold"));

const trigger = read(
  "src/components/domain/applications/OrganizerManualApplicationPanel.tsx",
);
assert.ok(trigger.includes('variant="outline"'));
assert.ok(!trigger.includes('variant={open ? "outline" : "default"}'));

const boardExcel = read(
  "src/components/domain/applications/OrganizerApplicationsBoard.tsx",
);
assert.ok(boardExcel.includes("OrganizerApplicantExcelTrigger"));
assert.ok(boardExcel.includes("OrganizerManualApplicationTrigger"));
assert.ok(boardExcel.includes("ExternalRegistrationLinkTrigger"));

const table = read(
  "src/components/domain/applications/OrganizerApplicationsTable.tsx",
);
assert.ok(table.includes("순번"));
assert.ok(table.includes("displaySequenceNumber"));

console.log("verify:event-applicant-sequence: OK");
