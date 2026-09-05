/**
 * 결과 UI 한글 label 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { outcomeStylePublicLabel } from "../src/lib/match-result-snapshot";
import { judgeCornerDecisionLabel } from "../src/lib/match-ops-judge-decision";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(outcomeStylePublicLabel("draw"), "무승부");
assert.equal(outcomeStylePublicLabel("decision"), "판정");
assert.equal(judgeCornerDecisionLabel("draw"), "무승부");

const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
assert.ok(panel.includes("outcomeStylePublicLabel"));

const operationFiles = [
  "src/components/domain/operation/MatchOpsJudgeDecisionSummary.tsx",
  "src/components/domain/operation/MatchOpsConfirmedResultPanel.tsx",
  "src/components/domain/operation/MatchOpsJudgeScoreSection.tsx",
];

for (const file of operationFiles) {
  const content = read(file);
  assert.ok(!content.includes('"DRAW"'));
  assert.ok(!content.includes(">DRAW<"));
}

console.log("verify:result-label-korean: OK");
