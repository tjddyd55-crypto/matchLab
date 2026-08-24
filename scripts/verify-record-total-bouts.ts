/**
 * 총전-only 전적 SSOT — `"9전"` 유전 판정 등
 *   npm run verify:record-total-bouts
 */
import assert from "node:assert/strict";
import {
  matchesFightRecordExperienceFilter,
  resolveFightRecordTotalBouts,
} from "../src/lib/fighter/fight-record-total-bouts";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
  resolveApprovedOptionTotalBouts,
  resolveUnmatchedCandidateTotalBouts,
} from "../src/lib/brackets/unmatched-candidate-filters";
import type { OrganizerApprovedFighterOptionVM } from "../src/lib/services/bracket.service";

function fixture(input: {
  id: string;
  recordSummary: string;
  totalBoutsSnapshot?: number | null;
  recordText?: string | null;
}): OrganizerApprovedFighterOptionVM {
  return {
    applicationId: input.id,
    fighterId: input.id,
    label: input.id,
    divisionId: "d1",
    divisionLabel: "고등부",
    appliedDivisionLabel: "고등부",
    currentDivisionLabel: "고등부",
    isOtherDivision: false,
    division: {
      sportType: null,
      ruleType: null,
      gender: "male",
      ageGroup: "고등부",
      weightClass: null,
      weightClassName: null,
      weightLimitText: null,
      skillLevel: null,
    },
    fighterName: input.id,
    gymName: "Gym",
    fighterGender: "male",
    isEligibleForBracket: true,
    eligibilityLabel: "",
    eligibilityReason: "",
    isAssignableForBracket: true,
    assignabilityLabel: "",
    recordSummary: input.recordSummary,
    totalBoutsSnapshot: input.totalBoutsSnapshot ?? null,
    recordText: input.recordText ?? null,
    applicationWeightKg: null,
    schoolLevel: null,
    schoolGrade: null,
  };
}

assert.equal(resolveFightRecordTotalBouts("9전"), 9);
assert.equal(resolveFightRecordTotalBouts("3전"), 3);
assert.equal(resolveFightRecordTotalBouts("무전"), 0);
assert.equal(resolveFightRecordTotalBouts("0전"), 0);
assert.equal(resolveFightRecordTotalBouts("9전 4승 1무 4패"), 9);
assert.equal(resolveFightRecordTotalBouts(""), null);
assert.equal(
  resolveFightRecordTotalBouts({
    recordSummary: "0승 0패 0무",
    totalBoutsSnapshot: 9,
  }),
  9,
);
assert.equal(resolveUnmatchedCandidateTotalBouts("0승 0패 0무"), 0);
assert.equal(resolveUnmatchedCandidateTotalBouts("3승 2패 1무"), 6);

assert.equal(
  resolveApprovedOptionTotalBouts(
    fixture({ id: "a", recordSummary: "9전", totalBoutsSnapshot: 9 }),
  ),
  9,
);

const nine = fixture({
  id: "nine",
  recordSummary: "9전",
  totalBoutsSnapshot: 9,
});

assert.ok(
  matchesFightRecordExperienceFilter(9, "experienced", ""),
  "9전 → 유전",
);
assert.ok(
  !matchesFightRecordExperienceFilter(9, "zero", ""),
  "9전 → 무전 아님",
);
assert.ok(
  matchesFightRecordExperienceFilter(9, "experienced", "10"),
  "유전 + 최대 10",
);
assert.ok(
  !matchesFightRecordExperienceFilter(9, "experienced", "8"),
  "유전 + 최대 8",
);

const filteredExperienced = filterUnmatchedQuickBarOptions([nine], {
  ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  recordStatus: "experienced",
});
assert.equal(filteredExperienced.length, 1);

const filteredZero = filterUnmatchedQuickBarOptions([nine], {
  ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  recordStatus: "zero",
});
assert.equal(filteredZero.length, 0);

const src = require("node:fs").readFileSync(
  "src/lib/brackets/unmatched-candidate-filters.ts",
  "utf8",
);
assert.ok(src.includes("resolveFightRecordTotalBouts"));
assert.ok(!src.includes('if (!trimmed) return 0'));

console.log("verify:record-total-bouts OK");
