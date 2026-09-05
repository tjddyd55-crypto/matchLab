/**
 * Partial round score save validation
 *   npm run verify:partial-round-score-save
 */
import assert from "node:assert/strict";
import {
  calculateJudgeScoreTotals,
  emptyRounds,
  validateJudgeSlotForSave,
} from "../src/lib/match-ops-judge-score";
import {
  hasAnyCompleteJudgeRound,
  isJudgeAllRoundsBlank,
  sumCompleteJudgeRounds,
  validateJudgeRounds,
} from "../src/lib/judge-round-score-validation";
import { computeScorecardTotals } from "../src/lib/judge-score-aggregation";

function assertPartialRoundValidation() {
  const roundCount = 3;

  // CASE 1: 1R only
  const case1 = [
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: null, blueScore: null },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.equal(validateJudgeSlotForSave(1, roundCount, case1), null);
  assert.equal(validateJudgeRounds(case1, 1), null);

  // CASE 2: 1R + 2R, 3R blank
  const case2 = [
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: 9, blueScore: 10 },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.equal(validateJudgeSlotForSave(2, roundCount, case2), null);

  // CASE 3: middle round only
  const case3 = [
    { roundNumber: 1, redScore: null, blueScore: null },
    { roundNumber: 2, redScore: 10, blueScore: 9 },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.equal(validateJudgeSlotForSave(3, roundCount, case3), null);

  // CASE 4: RED only
  const case4 = [
    { roundNumber: 1, redScore: 10, blueScore: null },
    { roundNumber: 2, redScore: null, blueScore: null },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.match(
    validateJudgeSlotForSave(1, roundCount, case4) ?? "",
    /홍\/청 점수/,
  );

  // CASE 5: partial then half-filled
  const case5 = [
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: 10, blueScore: null },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.match(
    validateJudgeSlotForSave(1, roundCount, case5) ?? "",
    /2라운드 홍\/청/,
  );

  // all blank allowed
  assert.equal(validateJudgeSlotForSave(1, roundCount, emptyRounds(3)), null);
  assert.equal(isJudgeAllRoundsBlank(emptyRounds(3)), true);
  assert.equal(hasAnyCompleteJudgeRound(emptyRounds(3)), false);
}

function assertPartialTotals() {
  const totals = calculateJudgeScoreTotals({
    roundCount: 3,
    slots: [
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: null, blueScore: null },
          { roundNumber: 3, redScore: null, blueScore: null },
        ],
      },
    ],
  });
  assert.equal(totals.redTotal, 10);
  assert.equal(totals.blueTotal, 9);
  assert.equal(totals.completedJudgeCount, 1);

  const summed = sumCompleteJudgeRounds([
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: null, blueScore: null },
  ]);
  assert.deepEqual(summed, { redTotal: 10, blueTotal: 9, completeRoundCount: 1 });

  const scorecardTotals = computeScorecardTotals([
    {
      roundNumber: 1,
      redScore: 10,
      blueScore: 9,
      redDeductions: 0,
      blueDeductions: 0,
    },
    {
      roundNumber: 2,
      redScore: null,
      blueScore: null,
      redDeductions: 0,
      blueDeductions: 0,
    },
  ]);
  assert.equal(scorecardTotals.redTotal, 10);
  assert.equal(scorecardTotals.blueTotal, 9);
}

function main() {
  assertPartialRoundValidation();
  assertPartialTotals();
  console.log("verify:partial-round-score-save: OK");
}

main();
