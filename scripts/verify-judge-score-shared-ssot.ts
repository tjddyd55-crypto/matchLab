/**
 * Judge score shared SSOT — match ops + judge URL
 *   npm run verify:judge-score-shared-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JudgeScorecardStatus } from "@/generated/prisma";
import {
  emptyRounds,
  isJudgeSlotEmpty,
  mapScorecardsToMatchOpsSlots,
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

  const service = read("src/lib/services/match-ops-judge-score.service.ts");
  assert.match(service, /judgeScorecardRepository\.upsertDraft/);
  assert.match(service, /deleteByMatchAndCredential/);
  assert.doesNotMatch(service, /confirmMatchResults/);

  const court = read("src/lib/services/judge-court.service.ts");
  assert.match(court, /judgeScorecardRepository\.upsertDraft/);
}

function assertSlotMapping() {
  const roundCount = 3;
  const slots = mapScorecardsToMatchOpsSlots({
    assignments: [
      { judgeOrder: 1, credentialId: "cred-1" },
      { judgeOrder: 3, credentialId: "cred-3" },
    ],
    scorecards: [
      {
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
  });

  assert.equal(slots.length, 3);
  assert.equal(slots[0]?.credentialId, "cred-1");
  assert.equal(slots[1]?.credentialId, "cred-2");
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

function main() {
  assertStaticWiring();
  assertSlotMapping();
  assertValidation();
  console.log("verify:judge-score-shared-ssot: OK");
}

main();
