/**
 * 통합 저장 — 임시저장/확정 시 JudgeScore 함께 저장 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
assert.ok(panel.includes("judgeScoreRef"));
assert.ok(panel.includes("saveScores"));
assert.ok(panel.includes("integratedSave"));

const section = read("src/components/domain/operation/MatchOpsJudgeScoreSection.tsx");
assert.ok(section.includes("saveScores"));
assert.ok(section.includes("integratedSave"));
assert.ok(section.includes("임시저장·확정 시 함께 저장"));

console.log("verify:unified-match-result-save: OK");
