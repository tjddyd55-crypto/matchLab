/**
 * Mouse-first match result entry controls
 *   npm run verify:mouse-first-match-result-entry
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertStaticWiring() {
  const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
  assert.match(panel, /aria-pressed=\{active\}/);
  assert.match(panel, /match-result-type-/);
  assert.doesNotMatch(panel, /<select[\s\S]*name="resultType"/);
  assert.match(panel, /WinnerCornerPicker/);

  const winnerPick = read("src/components/domain/brackets/WinnerCornerPicker.tsx");
  assert.match(winnerPick, /match-winner-\$\{c\.key\}/);
  assert.match(winnerPick, /aria-pressed/);

  const scorePick = read(
    "src/components/domain/operation/JudgeCornerScoreQuickPick.tsx",
  );
  assert.match(scorePick, /aria-pressed=\{selected\}/);
  assert.match(scorePick, /judge-score-\$\{corner\.toLowerCase\(\)\}-\$\{score\}/);
  assert.match(scorePick, /지우기/);
  assert.match(scorePick, /grid-cols-5/);

  const section = read(
    "src/components/domain/operation/MatchOpsJudgeScoreSection.tsx",
  );
  assert.match(section, /JudgeCornerScoreQuickPick/);
  assert.doesNotMatch(section, /type="number"/);
}

function main() {
  assertStaticWiring();
  console.log("verify:mouse-first-match-result-entry: OK");
}

main();
