/**
 * 승자·경기종료 표시 / 결과 입력 완료 제거 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const display = read("src/lib/operation-match-list-display.ts");
assert.ok(display.includes("isOperationMatchFinishedDisplay"));
assert.ok(display.includes("승자:"));
assert.ok(display.includes("hasWinner"));
assert.ok(!display.includes('"결과 입력 완료"'));

const phase = read("src/lib/match-operation-display.ts");
assert.ok(phase.includes('case "result_done":'));
assert.ok(phase.includes("경기종료"));
assert.ok(!phase.includes('"결과 입력 완료"'));

const pane = read(
  "src/components/domain/operation/OperationMatchListPane.tsx",
);
assert.ok(pane.includes("getOperationMatchListResultClassName"));
assert.ok(!pane.includes("결과 입력 완료"));

const badges = read(
  "src/components/domain/operation/OrganizerOperationStatusBadges.tsx",
);
assert.ok(!badges.includes("결과 입력 완료"));
assert.ok(badges.includes("결과 미입력"));

console.log("verify:operation-match-winner-presentation: OK");
