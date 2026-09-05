/**
 * 심판별 판정 + 표수 집계 검증.
 */
import assert from "node:assert/strict";
import {
  aggregateJudgeDecisions,
  buildMatchOpsJudgeDecisionRows,
  calculateJudgeDecision,
  judgeCornerDecisionLabel,
} from "../src/lib/match-ops-judge-decision";

const rounds29vs28 = [
  { roundNumber: 1, redScore: 10, blueScore: 9 },
  { roundNumber: 2, redScore: 9, blueScore: 10 },
  { roundNumber: 3, redScore: 10, blueScore: 9 },
];
const d1 = calculateJudgeDecision(rounds29vs28, 3);
assert.equal(d1.redTotal, 29);
assert.equal(d1.blueTotal, 28);
assert.equal(d1.decision, "red");
assert.equal(judgeCornerDecisionLabel(d1.decision), "홍코너 승");

const rounds28vs29 = [
  { roundNumber: 1, redScore: 9, blueScore: 10 },
  { roundNumber: 2, redScore: 10, blueScore: 9 },
  { roundNumber: 3, redScore: 9, blueScore: 10 },
];
assert.equal(calculateJudgeDecision(rounds28vs29, 3).decision, "blue");

const rounds28vs28 = [
  { roundNumber: 1, redScore: 10, blueScore: 10 },
  { roundNumber: 2, redScore: 9, blueScore: 9 },
  { roundNumber: 3, redScore: 9, blueScore: 9 },
];
assert.equal(calculateJudgeDecision(rounds28vs28, 3).decision, "draw");
assert.equal(judgeCornerDecisionLabel("draw"), "무승부");

const partial = [
  { roundNumber: 1, redScore: 10, blueScore: 9 },
  { roundNumber: 2, redScore: 10, blueScore: 9 },
  { roundNumber: 3, redScore: null, blueScore: null },
];
const partialDecision = calculateJudgeDecision(partial, 3);
assert.equal(partialDecision.redTotal, 20);
assert.equal(partialDecision.blueTotal, 18);
assert.equal(partialDecision.decision, "red");
assert.equal(partialDecision.isPartial, true);

const judges = buildMatchOpsJudgeDecisionRows({
  roundCount: 3,
  manualSlots: [
    {
      judgeOrder: 1,
      judgeName: "채점심판 1",
      rounds: rounds29vs28,
    },
  ],
  portalEntries: [
    {
      credentialId: "c1",
      judgeName: "김철수",
      rounds: rounds28vs29,
    },
    {
      credentialId: "c2",
      judgeName: "이영희",
      rounds: rounds29vs28,
    },
  ],
});
assert.equal(judges.length, 3);

const votes = aggregateJudgeDecisions(judges);
assert.equal(votes.redVotes, 2);
assert.equal(votes.blueVotes, 1);
assert.equal(votes.drawVotes, 0);
assert.equal(votes.recommendation, "red");

const tieVotes = aggregateJudgeDecisions([
  { decision: "red", redTotal: 29, blueTotal: 28 },
  { decision: "blue", redTotal: 28, blueTotal: 29 },
  { decision: "draw", redTotal: 28, blueTotal: 28 },
]);
assert.equal(tieVotes.redVotes, 1);
assert.equal(tieVotes.blueVotes, 1);
assert.equal(tieVotes.drawVotes, 1);
assert.equal(tieVotes.recommendation, "draw");

console.log("verify:judge-decision-vote-aggregation: OK");
