/**
 * 전체 경기 편집 workspace — court schedule 정렬 SSOT
 * 대진표 보기와 동일 순서 + 필터 후 상대 순서 유지
 */
import assert from "node:assert/strict";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "../src/lib/court-match-order";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const courts = [
  { id: "court-a", sortOrder: 1 },
  { id: "court-b", sortOrder: 2 },
];

const matches = [
  {
    id: "z",
    matchId: "z",
    courtId: "court-b",
    courtOrder: 1,
    matchNumber: null,
    globalMatchOrder: null,
    matchOrder: 0,
  },
  {
    id: "y",
    matchId: "y",
    courtId: "court-a",
    courtOrder: 2,
    matchNumber: null,
    globalMatchOrder: null,
    matchOrder: 0,
  },
  {
    id: "x",
    matchId: "x",
    courtId: "court-a",
    courtOrder: 1,
    matchNumber: null,
    globalMatchOrder: null,
    matchOrder: 0,
  },
];

const boardOrder = sortMatchesByCourtSchedule(matches, courts).map((m) => m.id);
const workspaceOrder = sortMatchesByCourtSchedule([...matches].reverse(), courts).map(
  (m) => m.id,
);

assert.deepEqual(boardOrder, ["x", "y", "z"]);
assert.deepEqual(workspaceOrder, boardOrder);

const labels = sortMatchesByCourtSchedule(matches, courts).map((m) =>
  formatCourtScheduleMatchOrderShort(m),
);
assert.deepEqual(labels, ["1경기", "2경기", "1경기"]);

// filter 후 상대 순서 유지 (renumber 금지)
const filtered = boardOrder.filter((id) => id === "y" || id === "z");
assert.deepEqual(filtered, ["y", "z"]);

const serviceSrc = readFileSync(
  join(process.cwd(), "src/lib/services/bracket.service.ts"),
  "utf8",
);
assert.ok(serviceSrc.includes("getOrganizerEventAllMatchesWorkspace"));
assert.ok(serviceSrc.includes("sortMatchesByCourtSchedule"));

const matchListSrc = readFileSync(
  join(process.cwd(), "src/components/domain/brackets/MatchListEditor.tsx"),
  "utf8",
);
assert.ok(matchListSrc.includes('orderMode === "courtSchedule"'));
assert.ok(matchListSrc.includes("sortMatchesByCourtSchedule"));

const pageSrc = readFileSync(
  join(
    process.cwd(),
    "src/app/(dashboard)/organizer/events/[eventId]/brackets/page.tsx",
  ),
  "utf8",
);
assert.ok(pageSrc.includes("OrganizerAllMatchesWorkspace"));
assert.ok(pageSrc.includes("parseBracketViewSubTab"));

const tabSrc = readFileSync(
  join(process.cwd(), "src/lib/brackets/bracket-page-tab.ts"),
  "utf8",
);
assert.ok(tabSrc.includes('"workspace"'));
assert.ok(tabSrc.includes("전체 경기 편집"));

console.log("verify:organizer-all-matches-workspace OK");
