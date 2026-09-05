/**
 * 경기 단위 라운드 규칙 effective rule 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  encodeMatchOperationalSettings,
  getEffectiveMatchRules,
} from "../src/lib/match-operational-settings";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const memo = encodeMatchOperationalSettings(
  { roundCount: 2, roundTimeSec: 90, overtimeEnabled: false, overtimeRoundCount: 0 },
  "현장 조정",
);
const rules = getEffectiveMatchRules({ resultMemo: memo });
assert.equal(rules.roundCount, 2);
assert.equal(rules.roundTimeSec, 90);
assert.equal(rules.displayMemo, "현장 조정");

const bar = read("src/components/domain/operation/MatchOpsMatchInfoBar.tsx");
assert.ok(bar.includes("MatchOperationalSettingsSelect"));
assert.ok(bar.includes("getEffectiveMatchRules"));

console.log("verify:match-ops-effective-round-rules: OK");
