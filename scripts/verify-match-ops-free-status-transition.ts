/**
 * 경기운영 자유 상태 전이 — 서버·UI·데이터 보존 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BracketMatchStatus } from "../src/generated/prisma";
import { assertBracketMatchStatusTransition } from "../src/lib/match-status-transition";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const OPERATIONAL: BracketMatchStatus[] = [
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
  BracketMatchStatus.finished,
  BracketMatchStatus.cancelled,
];

for (const from of OPERATIONAL) {
  for (const to of OPERATIONAL) {
    if (from === to) continue;
    assert.doesNotThrow(
      () => assertBracketMatchStatusTransition(from, to),
      `${from} → ${to}`,
    );
    assert.doesNotThrow(
      () =>
        assertBracketMatchStatusTransition(from, to, {
          hasOfficialResults: true,
        }),
      `${from} → ${to} (official results)`,
    );
  }
}

assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.called,
    BracketMatchStatus.waiting,
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.ongoing,
    BracketMatchStatus.called,
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.ongoing,
    BracketMatchStatus.waiting,
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.finished,
    BracketMatchStatus.ongoing,
    { hasOfficialResults: true },
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.cancelled,
    BracketMatchStatus.waiting,
    { hasOfficialResults: true },
  ),
);

const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
assert.ok(!panel.includes("finishedTerminal"));
assert.ok(panel.includes("isCurrentMatchStatus(status, optionValue)"));
assert.ok(!panel.includes("cancelledNeedsVoid"));

const service = read("src/lib/services/match.service.ts");
assert.ok(service.includes("updateMatchStatus"));
assert.ok(
  service.includes("await matchRepository.updateMatchStatus(input.matchId, input.status, tx)"),
);
assert.ok(!service.match(/updateMatchStatus[\s\S]*voidMatch/i));

const repo = read("src/lib/repositories/match.repository.ts");
const updateStatusBlock = repo.slice(
  repo.indexOf("async updateMatchStatus"),
  repo.indexOf("async updateMatchCourt"),
);
assert.ok(updateStatusBlock.includes("data: { status }"));
assert.ok(!updateStatusBlock.includes("matchResults"));
assert.ok(!updateStatusBlock.includes("judgeScore"));

const actions = read("src/features/matches/actions.ts");
assert.ok(actions.includes("updateMatchStatusAction"));

console.log("verify:match-ops-free-status-transition: OK");
