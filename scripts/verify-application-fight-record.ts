/**
 * 전적 입력 정책 — 총전만 / 총전+승무패 / 부분입력 / 합계
 *   npm run verify:application-fight-record
 */
import assert from "node:assert/strict";
import {
  buildRecordText,
  nullableDetailsFromFighterCache,
  parseRecordText,
  validateRecord,
  RECORD_PARTIAL_DETAIL_MESSAGE,
  RECORD_SUM_MISMATCH_MESSAGE,
} from "../src/lib/fighter/record";
import {
  matchesFightRecordExperienceFilter,
  resolveFightRecordTotalBouts,
} from "../src/lib/fighter/fight-record-total-bouts";
import { formatAutoMatchRecordText } from "../src/lib/brackets/explain-record-unmatched";
import {
  DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
  filterUnmatchedQuickBarOptions,
} from "../src/lib/brackets/unmatched-candidate-filters";
import type { OrganizerApprovedFighterOptionVM } from "../src/lib/services/bracket.service";

// 1. total=9, w/d/l=null → PASS, display=9전, 유전
{
  const r = { totalBouts: 9, wins: null, draws: null, losses: null };
  assert.ok(validateRecord(r).ok);
  assert.equal(buildRecordText(r), "9전");
  assert.equal(resolveFightRecordTotalBouts("9전"), 9);
  assert.ok(matchesFightRecordExperienceFilter(9, "experienced", ""));
  assert.ok(!matchesFightRecordExperienceFilter(9, "zero", ""));
}

// 2. total=9, 5/1/3 → PASS
{
  const r = { totalBouts: 9, wins: 5, draws: 1, losses: 3 };
  assert.ok(validateRecord(r).ok);
  assert.equal(buildRecordText(r), "9전 5승 1무 3패");
}

// 3. total=9, 5/null/null → FAIL partial
{
  const r = { totalBouts: 9, wins: 5, draws: null, losses: null };
  const v = validateRecord(r);
  assert.ok(!v.ok);
  assert.equal(v.error, RECORD_PARTIAL_DETAIL_MESSAGE);
}

// 4. total=9, 5/0/2 → FAIL sum
{
  const r = { totalBouts: 9, wins: 5, draws: 0, losses: 2 };
  const v = validateRecord(r);
  assert.ok(!v.ok);
  assert.equal(v.error, RECORD_SUM_MISMATCH_MESSAGE);
}

// 5. total=0, null/null/null → PASS 무전
{
  const r = { totalBouts: 0, wins: null, draws: null, losses: null };
  assert.ok(validateRecord(r).ok);
  assert.equal(buildRecordText(r), "무전");
  assert.ok(matchesFightRecordExperienceFilter(0, "zero", ""));
}

// 6. total=9, 0/0/0 → FAIL
{
  const r = { totalBouts: 9, wins: 0, draws: 0, losses: 0 };
  const v = validateRecord(r);
  assert.ok(!v.ok);
  assert.equal(v.error, RECORD_SUM_MISMATCH_MESSAGE);
}

// parse + display SSOT
assert.equal(parseRecordText("9전").ok && parseRecordText("9전").record.wins, null);
assert.equal(buildRecordText(parseRecordText("9전").ok ? parseRecordText("9전").record : { totalBouts: 0, wins: null, draws: null, losses: null }), "9전");
assert.equal(
  formatAutoMatchRecordText({
    totalBouts: 9,
    wins: null,
    draws: null,
    losses: null,
  }),
  "9전",
);

const nineOption = {
  applicationId: "a",
  fighterId: "a",
  label: "a",
  divisionId: "d",
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
  fighterName: "A",
  gymName: "G",
  fighterGender: "male",
  isEligibleForBracket: true,
  eligibilityLabel: "",
  eligibilityReason: "",
  isAssignableForBracket: true,
  assignabilityLabel: "",
  recordSummary: "9전",
  totalBoutsSnapshot: 9,
  recordText: "9전",
  applicationWeightKg: null,
  schoolLevel: null,
  schoolGrade: null,
} as OrganizerApprovedFighterOptionVM;

assert.equal(
  filterUnmatchedQuickBarOptions([nineOption], {
    ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
    recordStatus: "experienced",
  }).length,
  1,
);
assert.equal(
  filterUnmatchedQuickBarOptions([nineOption], {
    ...DEFAULT_UNMATCHED_QUICK_BAR_FILTERS,
    recordStatus: "zero",
  }).length,
  0,
);

// Fighter Int 캐시 → null 복원
{
  const d = nullableDetailsFromFighterCache({
    recordTotalBouts: 9,
    recordWin: 0,
    recordDraw: 0,
    recordLoss: 0,
  });
  assert.equal(d.wins, null);
  assert.equal(d.draws, null);
  assert.equal(d.losses, null);
}

console.log("verify:application-fight-record OK");
