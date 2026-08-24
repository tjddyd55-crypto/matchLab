/**
 * 신청자 관리 — 체육관 필터/그룹 + 대진 현황 필터
 *
 * fixture:
 *   A / T-MAC / assigned
 *   B / T-MAC / unassigned
 *   C / 팀타이런트 / assigned
 *   D / 산본더원 / unassigned
 */
import assert from "node:assert/strict";
import {
  buildApplicantAssignmentCountMap,
  buildApplicantGymFilterOptions,
  groupApplicantsByGymDisplayName,
  matchesApplicantAssignmentFilter,
  normalizeApplicantGymDisplayName,
  resolveApplicantAssignmentCount,
} from "../src/lib/applications/applicant-list-filters";

type Row = {
  id: string;
  gymName: string;
  fighterId: string;
  assignmentCount: number;
};

const rows: Row[] = [
  { id: "A", gymName: "T-MAC 종합격투기", fighterId: "f-a", assignmentCount: 1 },
  { id: "B", gymName: "T-MAC 종합격투기", fighterId: "f-b", assignmentCount: 0 },
  { id: "C", gymName: "팀타이런트", fighterId: "f-c", assignmentCount: 2 },
  { id: "D", gymName: "산본더원", fighterId: "f-d", assignmentCount: 0 },
];

function filterRows(
  list: Row[],
  opts: { gymName?: string; assignment?: "all" | "assigned" | "unassigned" },
) {
  return list.filter((r) => {
    if (
      opts.gymName &&
      normalizeApplicantGymDisplayName(r.gymName) !== opts.gymName
    ) {
      return false;
    }
    if (
      opts.assignment &&
      !matchesApplicantAssignmentFilter(r.assignmentCount, opts.assignment)
    ) {
      return false;
    }
    return true;
  });
}

// Gym filter options — display name SSOT, includes empty-gymId style names
const options = buildApplicantGymFilterOptions([
  { gymName: "T-MAC 종합격투기" },
  { gymName: "팀타이런트" },
  { gymName: "산본더원" },
  { gymName: "T-MAC 종합격투기" },
  { gymName: "  " },
]);
assert.deepEqual(new Set(options.map((o) => o.name)), new Set([
  "—",
  "T-MAC 종합격투기",
  "산본더원",
  "팀타이런트",
]));
assert.equal(options.length, 4);
// localeCompare("ko") 정렬 일관성
const resorted = [...options]
  .map((o) => o.name)
  .sort((a, b) => a.localeCompare(b, "ko"));
assert.deepEqual(
  options.map((o) => o.name),
  resorted,
);

assert.deepEqual(
  filterRows(rows, { gymName: "T-MAC 종합격투기" }).map((r) => r.id),
  ["A", "B"],
);
assert.deepEqual(
  filterRows(rows, { assignment: "assigned" }).map((r) => r.id),
  ["A", "C"],
);
assert.deepEqual(
  filterRows(rows, { assignment: "unassigned" }).map((r) => r.id),
  ["B", "D"],
);
assert.deepEqual(
  filterRows(rows, {
    gymName: "T-MAC 종합격투기",
    assignment: "unassigned",
  }).map((r) => r.id),
  ["B"],
);

// Grouping by display name (not gymId)
const groups = groupApplicantsByGymDisplayName(rows);
assert.equal(groups.length, 3);
assert.equal(groups.find((g) => g.gymName === "T-MAC 종합격투기")?.rows.length, 2);
assert.equal(groups.find((g) => g.gymName === "팀타이런트")?.rows.length, 1);
assert.equal(groups.find((g) => g.gymName === "산본더원")?.rows.length, 1);

const filteredGroups = groupApplicantsByGymDisplayName(
  filterRows(rows, { assignment: "unassigned" }),
);
assert.equal(filteredGroups.length, 2);
assert.ok(!filteredGroups.some((g) => g.gymName === "팀타이런트"));

// Assignment count map — multi-match counts as assigned (>=1)
const countMap = buildApplicantAssignmentCountMap([
  { fighterRedId: "f-a", fighterBlueId: "f-c" },
  { fighterRedId: "f-c", fighterBlueId: null },
]);
assert.equal(resolveApplicantAssignmentCount(countMap, "f-a"), 1);
assert.equal(resolveApplicantAssignmentCount(countMap, "f-c"), 2);
assert.equal(resolveApplicantAssignmentCount(countMap, "f-b"), 0);
assert.equal(resolveApplicantAssignmentCount(countMap, null), 0);
assert.equal(matchesApplicantAssignmentFilter(2, "assigned"), true);
assert.equal(matchesApplicantAssignmentFilter(0, "unassigned"), true);

console.log("verify:applicant-list-filters PASS");
