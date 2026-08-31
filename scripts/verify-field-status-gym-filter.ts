/**
 * 현장 계체 — 체육관 필터 SSOT (신청자 관리와 동일한 display name)
 *
 * 버그 회귀: gymId null row는 option value가 `name:…`였지만 predicate는 gymId만 비교.
 */
import assert from "node:assert/strict";
import { buildApplicantGymFilterOptions } from "../src/lib/applications/applicant-list-filters";
import {
  matchesFieldStatusGymFilter,
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
} from "../src/components/domain/field-status/field-status-filters";
import type { FieldStatusRowDTO } from "../src/lib/services/field-status.service";

function row(
  partial: Pick<FieldStatusRowDTO, "applicationId" | "gymName" | "gymId"> &
    Partial<FieldStatusRowDTO>,
): FieldStatusRowDTO {
  return {
    applicationId: partial.applicationId,
    gymName: partial.gymName,
    gymId: partial.gymId ?? null,
    fighterName: partial.fighterName ?? "선수",
    divisionId: partial.divisionId ?? "d1",
    divisionLabel: partial.divisionLabel ?? "일반부",
    division: partial.division ?? null,
    weightClassLabel: partial.weightClassLabel ?? "-60",
    weighInStatus: partial.weighInStatus ?? "pending",
    checkInStatus: partial.checkInStatus ?? "checked_in",
    weighInFailureResolution: partial.weighInFailureResolution ?? null,
    isEligibleForBracket: partial.isEligibleForBracket ?? true,
    fighterId: partial.fighterId ?? "f1",
    gender: partial.gender ?? "male",
    birthDateLabel: partial.birthDateLabel ?? "",
    applicationWeightKg: partial.applicationWeightKg ?? null,
    actualWeightKg: partial.actualWeightKg ?? null,
    bracketMatchCards: partial.bracketMatchCards ?? [],
  };
}

const rows = [
  row({
    applicationId: "a1",
    gymName: "T-MAC 종합격투기",
    gymId: "gym-a",
    fighterName: "김A",
    divisionLabel: "일반부",
    weighInStatus: "pending",
  }),
  row({
    applicationId: "b1",
    gymName: "팀타이런트",
    gymId: null,
    fighterName: "이B",
    divisionLabel: "일반부",
    weighInStatus: "pass",
  }),
  row({
    applicationId: "c1",
    gymName: "T-MAC 종합격투기",
    gymId: null,
    fighterName: "박C",
    divisionLabel: "시니어부",
    weighInStatus: "pending",
  }),
];

const gymOptions = buildApplicantGymFilterOptions(rows);
assert.deepEqual(
  new Set(gymOptions.map((o) => o.name)),
  new Set(["T-MAC 종합격투기", "팀타이런트"]),
);

function filterRows(
  list: typeof rows,
  opts: {
    gymFilter?: string;
    divisionId?: string;
    weighInFilter?: string;
    searchQuery?: string;
  },
) {
  return list.filter((r) => {
    if (!matchesFieldStatusGymFilter(r, opts.gymFilter ?? "all")) return false;
    if (opts.divisionId && opts.divisionId !== "all" && r.divisionId !== opts.divisionId) {
      return false;
    }
    if (opts.weighInFilter === "pending" && r.weighInStatus !== "pending") {
      return false;
    }
    if (!matchesFieldStatusSearchQuery(r, opts.searchQuery ?? "")) return false;
    if (!matchesFieldStatusSummaryFilter(r, "all")) return false;
    return true;
  });
}

// gymId null row도 display name으로 필터
assert.deepEqual(
  filterRows(rows, { gymFilter: "T-MAC 종합격투기" }).map((r) => r.applicationId),
  ["a1", "c1"],
);
assert.deepEqual(
  filterRows(rows, { gymFilter: "팀타이런트" }).map((r) => r.applicationId),
  ["b1"],
);
assert.equal(filterRows(rows, { gymFilter: "all" }).length, 3);

// 조합: 체육관 + 계체 대기
assert.deepEqual(
  filterRows(rows, {
    gymFilter: "T-MAC 종합격투기",
    weighInFilter: "pending",
  }).map((r) => r.applicationId),
  ["a1", "c1"],
);

// 조합: 체육관 + 검색
assert.deepEqual(
  filterRows(rows, {
    gymFilter: "T-MAC 종합격투기",
    searchQuery: "박",
  }).map((r) => r.applicationId),
  ["c1"],
);

// 회귀: gymId 기준 비교는 null row를 놓침
assert.notEqual(
  rows.filter((r) => r.gymId === "gym-a").length,
  filterRows(rows, { gymFilter: "T-MAC 종합격투기" }).length,
);

console.log("verify:field-status-gym-filter PASS");
