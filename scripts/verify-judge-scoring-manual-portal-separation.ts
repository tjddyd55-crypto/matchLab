/**
 * Manual vs Judge Portal scoring separation
 *   npm run verify:judge-scoring-manual-portal-separation
 */
import assert from "node:assert/strict";
import { JudgeScorecardStatus } from "@/generated/prisma";
import {
  buildMatchOpsSlotLoginId,
  calculateJudgeScoreTotals,
  classifyScorecardSource,
  emptyRounds,
  isMatchOpsManualLoginId,
  isPortalJudgeLoginId,
  mapManualScorecardsToSlots,
  mapPortalScorecards,
  MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  parseManualSlotOrderFromLoginId,
  resolveManualSlotCount,
  validateJudgeSlotForSave,
} from "../src/lib/match-ops-judge-score";

const EVENT_ID = "evt-sep-test";

function manualCard(order: number, red = 10, blue = 9) {
  const loginId = buildMatchOpsSlotLoginId(EVENT_ID, order);
  return {
    scorecardId: `sc-manual-${order}`,
    credentialId: `cred-manual-${order}`,
    loginId,
    judgeName: `채점심판 ${order}`,
    status: JudgeScorecardStatus.submitted,
    updatedAt: new Date(`2026-01-0${order}T10:00:00Z`),
    redTotal: red * 3,
    blueTotal: blue * 3,
    rounds: [
      { roundNumber: 1, redScore: red, blueScore: blue },
      { roundNumber: 2, redScore: red, blueScore: blue },
      { roundNumber: 3, redScore: red, blueScore: blue },
    ],
  };
}

function portalCard(name: string, suffix: string, red = 10, blue = 9) {
  return {
    scorecardId: `sc-portal-${suffix}`,
    credentialId: `cred-portal-${suffix}`,
    loginId: `court-court1-${name}-${suffix}`,
    judgeName: name,
    status: JudgeScorecardStatus.submitted,
    updatedAt: new Date(`2026-01-10T10:0${suffix}:00Z`),
    redTotal: red * 3,
    blueTotal: blue * 3,
    rounds: [
      { roundNumber: 1, redScore: red, blueScore: blue },
      { roundNumber: 2, redScore: red, blueScore: blue },
      { roundNumber: 3, redScore: red, blueScore: blue },
    ],
  };
}

function assertSourceClassification() {
  const manualLogin = buildMatchOpsSlotLoginId(EVENT_ID, 1);
  assert.equal(isMatchOpsManualLoginId(manualLogin, EVENT_ID), true);
  assert.equal(isPortalJudgeLoginId(manualLogin), false);
  assert.equal(
    classifyScorecardSource({
      loginId: manualLogin,
      eventId: EVENT_ID,
      assignmentJudgeOrder: null,
    }),
    "OPERATOR_MANUAL",
  );

  const portalLogin = "court-c1-kim-19900101";
  assert.equal(isPortalJudgeLoginId(portalLogin), true);
  assert.equal(
    classifyScorecardSource({
      loginId: portalLogin,
      eventId: EVENT_ID,
      assignmentJudgeOrder: null,
    }),
    "JUDGE_PORTAL",
  );
}

function assertManualOnlyRegression() {
  const scorecards = [
    manualCard(1),
    manualCard(2),
    manualCard(3, 9, 10),
  ];
  const manualSlots = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
    roundCount: 3,
    slotCount: MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  });
  const portalEntries = mapPortalScorecards({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
  });

  assert.equal(manualSlots.length, 3);
  assert.equal(portalEntries.length, 0);
  assert.equal(manualSlots[0]?.rounds[0]?.redScore, 10);

  const totals = calculateJudgeScoreTotals({
    roundCount: 3,
    manualSlots,
    portalEntries,
  });
  assert.equal(totals.completedJudgeCount, 3);
  assert.equal(totals.portalCompletedCount, 0);
}

function assertPortalOnly() {
  const scorecards = [portalCard("김철수", "1"), portalCard("이영희", "2")];
  const manualSlots = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
    roundCount: 3,
    slotCount: MATCH_OPS_JUDGE_DEFAULT_SLOT_COUNT,
  });
  const portalEntries = mapPortalScorecards({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
  });

  assert.equal(
    manualSlots.every((slot) => slot.status === "none"),
    true,
  );
  assert.equal(portalEntries.length, 2);
  assert.deepEqual(
    portalEntries.map((entry) => entry.judgeName),
    ["김철수", "이영희"],
  );
}

function assertMixedNoMerge() {
  const scorecards = [manualCard(1), portalCard("김철수", "1"), portalCard("이영희", "2")];
  const manualSlots = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
    roundCount: 3,
    slotCount: 3,
  });
  const portalEntries = mapPortalScorecards({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
  });

  assert.equal(manualSlots[0]?.credentialId, "cred-manual-1");
  assert.equal(manualSlots[1]?.status, "none");
  assert.equal(portalEntries.length, 2);

  const totals = calculateJudgeScoreTotals({
    roundCount: 3,
    manualSlots,
    portalEntries,
  });
  assert.equal(totals.completedJudgeCount, 3);
}

function assertFourPlusPortalJudges() {
  const scorecards = [
    portalCard("A", "1"),
    portalCard("B", "2"),
    portalCard("C", "3"),
    portalCard("D", "4"),
  ];
  const portalEntries = mapPortalScorecards({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
  });
  assert.equal(portalEntries.length, 4);
}

function assertDynamicManualSlots() {
  const scorecards = [manualCard(1), manualCard(4)];
  const manualSlotOrdersFromData = scorecards
    .map((card) => parseManualSlotOrderFromLoginId(card.loginId, EVENT_ID))
    .filter((order): order is number => order != null);
  const slotCount = resolveManualSlotCount({ manualSlotOrdersFromData });
  assert.equal(slotCount, 4);

  const expanded = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [],
    scorecards,
    roundCount: 3,
    slotCount,
  });
  assert.equal(expanded.length, 4);
  assert.equal(expanded[3]?.credentialId, "cred-manual-4");
}

function assertLegacyAssignmentFallback() {
  const legacyCard = {
    scorecardId: "sc-legacy",
    credentialId: "cred-legacy",
    loginId: "legacy-judge-login",
    judgeName: "채점심판 2",
    status: JudgeScorecardStatus.submitted,
    updatedAt: new Date("2026-01-02T10:00:00Z"),
    redTotal: 30,
    blueTotal: 27,
    rounds: emptyRounds(3).map((round) => ({
      ...round,
      redScore: 10,
      blueScore: 9,
    })),
  };
  const manualSlots = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [{ judgeOrder: 2, credentialId: "cred-legacy" }],
    scorecards: [legacyCard],
    roundCount: 3,
    slotCount: 3,
  });
  assert.equal(manualSlots[1]?.credentialId, "cred-legacy");
  assert.equal(manualSlots[1]?.judgeName, "채점심판 2");
}

function assertPartialRoundsForBothSources() {
  const partialRounds = [
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: null, blueScore: null },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];

  const manualSlots = mapManualScorecardsToSlots({
    eventId: EVENT_ID,
    assignments: [],
    scorecards: [
      {
        ...manualCard(1),
        rounds: partialRounds,
        redTotal: 10,
        blueTotal: 9,
      },
    ],
    roundCount: 3,
    slotCount: 3,
  });
  assert.equal(validateJudgeSlotForSave(1, 3, manualSlots[0]!.rounds), null);

  const portalEntries = mapPortalScorecards({
    eventId: EVENT_ID,
    assignments: [],
    scorecards: [
      {
        ...portalCard("김철수", "1"),
        rounds: partialRounds,
        redTotal: 10,
        blueTotal: 9,
      },
    ],
  });
  assert.equal(portalEntries.length, 1);

  const totals = calculateJudgeScoreTotals({
    roundCount: 3,
    manualSlots,
    portalEntries,
  });
  assert.equal(totals.redTotal, 20);
  assert.equal(totals.blueTotal, 18);
  assert.equal(totals.manualCompletedCount, 1);
  assert.equal(totals.portalCompletedCount, 1);
}

function main() {
  assertSourceClassification();
  assertManualOnlyRegression();
  assertPortalOnly();
  assertMixedNoMerge();
  assertFourPlusPortalJudges();
  assertDynamicManualSlots();
  assertLegacyAssignmentFallback();
  assertPartialRoundsForBothSources();
  console.log("verify:judge-scoring-manual-portal-separation: OK");
}

main();
