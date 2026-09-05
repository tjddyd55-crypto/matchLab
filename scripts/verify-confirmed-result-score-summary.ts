/**
 * 확정 결과 조회 UI 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const panel = read("src/components/domain/operation/MatchOpsConfirmedResultPanel.tsx");
assert.ok(panel.includes("MatchOpsJudgeDecisionSummary"));
assert.ok(panel.includes("확정완료"));
assert.ok(panel.includes("outcomeStylePublicLabel"));
assert.ok(!panel.includes("DRAW"));

const summary = read("src/components/domain/operation/MatchOpsJudgeDecisionSummary.tsx");
assert.ok(summary.includes("심판 판정 집계"));
assert.ok(summary.includes("무승부"));
assert.ok(!summary.includes("DRAW"));

console.log("verify:confirmed-result-score-summary: OK");
console.log("verify:confirmed-result-visibility: OK");
