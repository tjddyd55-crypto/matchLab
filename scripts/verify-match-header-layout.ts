/**
 * 경기 카드 상단 select+status 동일 행 + PDF kg cell
 *   npm run verify:match-header-layout
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const root = process.cwd();
  const card = readFileSync(
    join(root, "src/components/domain/brackets/OrganizerMatchEditCard.tsx"),
    "utf8",
  );
  const compact = readFileSync(
    join(root, "src/components/domain/brackets/BracketMatchCompactRow.tsx"),
    "utf8",
  );
  const printDoc = readFileSync(
    join(root, "src/components/domain/brackets/BracketPrintDocument.tsx"),
    "utf8",
  );
  const css = readFileSync(
    join(root, "src/components/domain/brackets/bracket-print.css"),
    "utf8",
  );
  const printSvc = readFileSync(
    join(root, "src/lib/services/bracket-print.service.ts"),
    "utf8",
  );
  const layout = readFileSync(
    join(root, "src/lib/ui/match-grid-layout.ts"),
    "utf8",
  );

  assert.match(card, /flex max-w-full flex-wrap items-center justify-end gap-2/);
  assert.match(card, /matchDivisionSelectClass/);
  assert.match(card, /MatchWeightKgInput/);
  assert.match(card, /leadingExtra/);
  assert.match(compact, /items-center justify-between/);
  assert.match(compact, /leadingExtra/);
  assert.match(layout, /matchDivisionSelectClass/);
  assert.match(layout, /matchWeightInputClass/);
  assert.match(layout, /text-sm font-semibold/);

  assert.match(printDoc, /ops-print-match-no-cell/);
  assert.match(printDoc, /ops-print-match-kg/);
  assert.match(printDoc, /weightLabel/);
  assert.match(css, /ops-print-match-kg/);
  assert.match(css, /--bracket-print-no-w:\s*54px/);
  assert.match(css, /grid-template-columns:/);
  assert.doesNotMatch(printDoc, /ops-print-fighters/);
  assert.match(printSvc, /resolveMatchWeightLabel/);
  assert.match(printSvc, /weightLabel/);

  console.log("verify:match-header-layout OK");
}

main();
