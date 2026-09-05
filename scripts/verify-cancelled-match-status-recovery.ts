/**
 * 취소 경기 상태 복구 — 서버·UI 일치 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BracketMatchStatus } from "../src/generated/prisma";
import {
  assertBracketMatchStatusTransition,
  canRecoverCancelledMatchStatus,
} from "../src/lib/match-status-transition";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(
  canRecoverCancelledMatchStatus(BracketMatchStatus.waiting, false),
  true,
);
assert.equal(
  canRecoverCancelledMatchStatus(BracketMatchStatus.called, false),
  true,
);
assert.equal(
  canRecoverCancelledMatchStatus(BracketMatchStatus.ongoing, false),
  true,
);
assert.equal(
  canRecoverCancelledMatchStatus(BracketMatchStatus.waiting, true),
  true,
);

assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.cancelled,
    BracketMatchStatus.waiting,
    { hasOfficialResults: false },
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.cancelled,
    BracketMatchStatus.called,
    { hasOfficialResults: false },
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.cancelled,
    BracketMatchStatus.ongoing,
    { hasOfficialResults: false },
  ),
);
assert.doesNotThrow(() =>
  assertBracketMatchStatusTransition(
    BracketMatchStatus.cancelled,
    BracketMatchStatus.waiting,
    { hasOfficialResults: true },
  ),
);

const panel = read(
  "src/components/domain/brackets/OrganizerMatchOpsPanel.tsx",
);
assert.ok(panel.includes("hasOfficialResults"));
assert.ok(!panel.includes("cancelledNeedsVoid"));
assert.ok(!panel.includes("경기취소는 되돌리기 어려울 수"));

const actions = read(
  "src/components/domain/operation/OrganizerOperationActions.tsx",
);
assert.ok(actions.includes("경기준비로 복구"));
assert.ok(!actions.includes("결과 초기화 후 복구"));

const service = read("src/lib/services/match.service.ts");
assert.ok(service.includes("hasOfficialResults"));

console.log("verify:cancelled-match-status-recovery: OK");
