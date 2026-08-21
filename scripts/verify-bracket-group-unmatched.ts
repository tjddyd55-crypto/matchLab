/**
 * 대진 그룹 미매칭 SSOT (정적)
 *   npm run verify:bracket-group-unmatched
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const auto = readFileSync(
    join(process.cwd(), "src/lib/services/bracket-auto-match.service.ts"),
    "utf8",
  );
  const bracket = readFileSync(
    join(process.cwd(), "src/lib/services/bracket.service.ts"),
    "utf8",
  );
  const panel = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/UnmatchedBracketCandidatesPanel.tsx",
    ),
    "utf8",
  );
  const reasons = readFileSync(
    join(process.cwd(), "src/lib/brackets/auto-match.ts"),
    "utf8",
  );

  assert.match(reasons, /not_assigned/);
  assert.match(auto, /not_assigned/);
  assert.match(auto, /listUnmatchedCandidatesForEvent/);
  // 재시뮬 leftover 금지 — pairWithRecordAndGrade 를 unmatched 목록에서 쓰지 않음
  const unmatchedFn = auto.slice(
    auto.indexOf("async listUnmatchedCandidatesForEvent"),
    auto.indexOf("async generateAutoBracketMatchesForEvent"),
  );
  assert.equal(unmatchedFn.includes("pairWithRecordAndGrade"), false);
  assert.match(unmatchedFn, /placedIds/);

  assert.match(bracket, /listOrganizerEventBrackets/);
  assert.match(bracket, /applicantCount/);
  assert.match(bracket, /unmatchedCount/);
  assert.match(bracket, /listApprovedRegisteredApplicationsForDivisionAggregation/);

  assert.match(panel, /not_assigned/);

  const list = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/OrganizerBracketList.tsx",
    ),
    "utf8",
  );
  assert.match(list, /unmatchedCount\}명/);
  assert.doesNotMatch(list, /전체 보기/);
  assert.doesNotMatch(list, /unmatchedPreview/);
  assert.doesNotMatch(list, /unmatchedFighters\.map/);

  console.log("verify:bracket-group-unmatched OK");
}

main();
