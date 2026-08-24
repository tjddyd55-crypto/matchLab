/**
 * 미매칭 선수 빠른 배정 필터 SSOT
 *   npm run verify:unmatched-quick-bar-filters
 */
import assert from "node:assert/strict";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
  resolveUnmatchedCandidateTotalBouts,
} from "../src/lib/brackets/unmatched-candidate-filters";
import type { OrganizerApprovedFighterOptionVM } from "../src/lib/services/bracket.service";

function fixtureOption(input: {
  id: string;
  name: string;
  recordSummary: string;
  weight?: number | null;
  ageGroup?: string | null;
  gender?: string | null;
}): OrganizerApprovedFighterOptionVM {
  return {
    applicationId: input.id,
    fighterId: input.id,
    label: input.name,
    divisionId: "div-1",
    divisionLabel: "고등부 · 남성",
    appliedDivisionLabel: "고등부 · 남성",
    currentDivisionLabel: "고등부 · 남성",
    isOtherDivision: false,
    division: {
      sportType: null,
      ruleType: null,
      gender: input.gender ?? "male",
      ageGroup: input.ageGroup ?? "고등부",
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
    fighterName: input.name,
    gymName: "Gym",
    fighterGender: input.gender ?? "male",
    isEligibleForBracket: true,
    eligibilityLabel: "",
    eligibilityReason: "",
    isAssignableForBracket: true,
    assignabilityLabel: "",
    recordSummary: input.recordSummary,
    applicationWeightKg: input.weight ?? null,
  };
}

function main() {
  assert.equal(resolveUnmatchedCandidateTotalBouts("0승 0패 0무"), 0);
  assert.equal(resolveUnmatchedCandidateTotalBouts("3승 2패 1무"), 6);
  assert.equal(resolveUnmatchedCandidateTotalBouts("9전"), 9);
  assert.equal(resolveUnmatchedCandidateTotalBouts(""), null);

  const options = [
    fixtureOption({ id: "a", name: "A", recordSummary: "0승 0패 0무" }),
    fixtureOption({ id: "b", name: "B", recordSummary: "1승 0패 0무" }),
    fixtureOption({ id: "c", name: "C", recordSummary: "2승 0패 1무" }),
    fixtureOption({ id: "d", name: "D", recordSummary: "1승 1패 1무" }),
    fixtureOption({ id: "e", name: "E", recordSummary: "3승 1패 0무" }),
    fixtureOption({ id: "f", name: "F", recordSummary: "6승 2패 2무" }),
  ];

  const ids = (list: OrganizerApprovedFighterOptionVM[]) =>
    list.map((o) => o.fighterId);

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(options, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        recordStatus: "zero",
      }),
    ),
    ["a"],
  );

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(options, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        recordStatus: "experienced",
      }),
    ),
    ["b", "c", "d", "e", "f"],
  );

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(options, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        recordStatus: "experienced",
        maxTotalBouts: "3",
      }),
    ),
    ["b", "c", "d"],
  );

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(options, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        recordStatus: "experienced",
        maxTotalBouts: "4",
      }),
    ),
    ["b", "c", "d", "e"],
  );

  const weighted = [
    fixtureOption({
      id: "w1",
      name: "W1",
      recordSummary: "0승 0패 0무",
      weight: 64,
      ageGroup: "중등부",
      gender: "male",
    }),
    fixtureOption({
      id: "w2",
      name: "W2",
      recordSummary: "1승 0패 0무",
      weight: 68,
      ageGroup: "고등부",
      gender: "female",
    }),
  ];

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(weighted, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        ageGroups: ["중등부"],
        genders: ["남성"],
        weights: [64],
      }),
    ),
    ["w1"],
  );

  assert.deepEqual(
    ids(
      filterUnmatchedQuickBarOptions(weighted, {
        ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
        search: "w2",
        genders: ["여성"],
      }),
    ),
    ["w2"],
  );

  const panel = require("node:fs").readFileSync(
    "src/components/domain/brackets/EventWideUnmatchedQuickBar.tsx",
    "utf8",
  );
  assert.match(panel, /미매칭 선수/);
  assert.equal(panel.includes("전체 미배정 선수 빠른 배정"), false);
  assert.equal(
    panel.includes("선수의 홍코너·청코너 버튼을 누르면"),
    false,
  );

  console.log("verify:unmatched-quick-bar-filters OK");
}

main();
