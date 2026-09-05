/**
 * Judge score shared SSOT — match ops + judge URL
 *   npm run verify:judge-score-shared-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JudgeScorecardStatus } from "@/generated/prisma";
import {
  calculateJudgeScoreTotals,
  emptyRounds,
  isJudgeSlotEmpty,
  mapManualScorecardsToSlots,
  validateJudgeSlotForSave,
} from "../src/lib/match-ops-judge-score";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertStaticWiring() {
  const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
  assert.match(panel, /MatchOpsJudgeScoreSection/);
  assert.match(panel, /최종결과/);

  const section = read(
    "src/components/domain/operation/MatchOpsJudgeScoreSection.tsx",
  );
  assert.match(section, /saveMatchOpsJudgeScoresAction/);
  assert.match(section, /getMatchOpsJudgeScoresAction/);
  assert.match(section, /POLL_MS = 4000/);
  assert.match(section, /dirty/);
  assert.match(section, /calculateJudgeScoreTotals/);
  assert.match(section, /최종 합계/);
  assert.match(section, /수동 채점심판/);
  assert.match(section, /실제 심판/);
  assert.doesNotMatch(section, /confirmMatchResults/);

  const service = read("src/lib/services/match-ops-judge-score.service.ts");
  assert.match(service, /judgeScorecardRepository\.upsertDraft/);
  assert.match(service, /deleteByMatchAndCredential/);
  assert.match(service, /mapPortalScorecards/);
  assert.match(service, /mapManualScorecardsToSlots/);
  assert.doesNotMatch(service, /confirmMatchResults/);

  const court = read("src/lib/services/judge-court.service.ts");
  assert.match(court, /judgeScorecardRepository\.upsertDraft/);
}

function assertSlotMapping() {
  const roundCount = 3;
  const eventId = "evt-test";
  const slots = mapManualScorecardsToSlots({
    eventId,
    assignments: [
      { judgeOrder: 1, credentialId: "cred-1" },
      { judgeOrder: 3, credentialId: "cred-3" },
    ],
    scorecards: [
      {
        scorecardId: "sc-1",
        loginId: `matchops-${eventId}-slot-1`,
        credentialId: "cred-1",
        judgeName: "심판A",
        status: JudgeScorecardStatus.submitted,
        updatedAt: new Date("2026-01-01T10:00:00Z"),
        redTotal: 30,
        blueTotal: 27,
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
          { roundNumber: 3, redScore: 10, blueScore: 9 },
        ],
      },
      {
        scorecardId: "sc-2",
        loginId: "court-c1-judge-19900101",
        credentialId: "cred-2",
        judgeName: "심판B",
        status: JudgeScorecardStatus.submitted,
        updatedAt: new Date("2026-01-01T10:01:00Z"),
        redTotal: 29,
        blueTotal: 28,
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 9, blueScore: 10 },
          { roundNumber: 3, redScore: 10, blueScore: 9 },
        ],
      },
    ],
    roundCount,
    slotCount: 3,
  });

  assert.equal(slots.length, 3);
  assert.equal(slots[0]?.credentialId, "cred-1");
  assert.equal(slots[1]?.status, "none");
  assert.equal(slots[2]?.credentialId, "cred-3");
  assert.equal(slots[2]?.status, "none");
}

function assertValidation() {
  const rounds = emptyRounds(3);
  assert.equal(isJudgeSlotEmpty(rounds), true);
  assert.equal(validateJudgeSlotForSave(1, 3, rounds), null);

  const partial = [
    { roundNumber: 1, redScore: 10, blueScore: null },
    { roundNumber: 2, redScore: null, blueScore: null },
    { roundNumber: 3, redScore: null, blueScore: null },
  ];
  assert.match(
    validateJudgeSlotForSave(2, 3, partial) ?? "",
    /홍\/청 점수/,
  );

  const complete = [
    { roundNumber: 1, redScore: 10, blueScore: 9 },
    { roundNumber: 2, redScore: 10, blueScore: 9 },
    { roundNumber: 3, redScore: 10, blueScore: 9 },
  ];
  assert.equal(validateJudgeSlotForSave(1, 3, complete), null);
}

function assertJudgeScoreTotals() {
  const roundCount = 2;

  const caseA = calculateJudgeScoreTotals({
    roundCount,
    manualSlots: [
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
        ],
      },
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 9, blueScore: 10 },
        ],
      },
    ],
    portalEntries: [
      {
        rounds: [
          { roundNumber: 1, redScore: 9, blueScore: 10 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
        ],
      },
    ],
  });
  assert.equal(caseA.redTotal, 58);
  assert.equal(caseA.blueTotal, 56);
  assert.equal(caseA.completedJudgeCount, 3);
  assert.equal(caseA.manualCompletedCount, 2);
  assert.equal(caseA.portalCompletedCount, 1);
  assert.equal(caseA.isTie, false);

  const caseB = calculateJudgeScoreTotals({
    roundCount,
    manualSlots: [
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
        ],
      },
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 9, blueScore: 10 },
        ],
      },
      {
        rounds: emptyRounds(roundCount),
      },
    ],
  });
  assert.equal(caseB.redTotal, 39);
  assert.equal(caseB.blueTotal, 37);
  assert.equal(caseB.completedJudgeCount, 2);

  const caseC = calculateJudgeScoreTotals({
    roundCount,
    slots: [
      { rounds: emptyRounds(roundCount) },
      { rounds: emptyRounds(roundCount) },
      { rounds: emptyRounds(roundCount) },
    ],
  });
  assert.equal(caseC.redTotal, null);
  assert.equal(caseC.blueTotal, null);
  assert.equal(caseC.completedJudgeCount, 0);

  const caseD = calculateJudgeScoreTotals({
    roundCount,
    manualSlots: [
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
        ],
      },
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 9, blueScore: 8 },
        ],
      },
    ],
  });
  assert.equal(caseD.blueTotal, 35);

  const caseE = calculateJudgeScoreTotals({
    roundCount,
    manualSlots: [
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: 9 },
          { roundNumber: 2, redScore: 10, blueScore: 9 },
        ],
      },
      {
        rounds: [
          { roundNumber: 1, redScore: 10, blueScore: null },
          { roundNumber: 2, redScore: null, blueScore: null },
        ],
      },
    ],
  });
  assert.equal(caseE.redTotal, 20);
  assert.equal(caseE.blueTotal, 18);
  assert.equal(caseE.completedJudgeCount, 1);

  const caseF = calculateJudgeScoreTotals({
    roundCount: 1,
    manualSlots: [{ rounds: [{ roundNumber: 1, redScore: 10, blueScore: 9 }] }],
    portalEntries: [{ rounds: [{ roundNumber: 1, redScore: 9, blueScore: 10 }] }],
  });
  assert.equal(caseF.redTotal, 19);
  assert.equal(caseF.blueTotal, 19);
  assert.equal(caseF.isTie, true);
}

function main() {
  assertStaticWiring();
  assertSlotMapping();
  assertValidation();
  assertJudgeScoreTotals();
  console.log("verify:judge-score-shared-ssot: OK");
}

main();
