/**
 * PDF 메모 행 + weight SSOT
 *   npm run verify:bracket-pdf-match-memo
 *   npm run verify:bracket-pdf-match-weight
 *   npm run verify:bracket-pdf-border
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const root = process.cwd();
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
  const format = readFileSync(
    join(root, "src/lib/brackets/bracket-print-format.ts"),
    "utf8",
  );

  assert.match(printDoc, /ops-print-match-block/);
  assert.match(printDoc, /ops-print-memo-row/);
  assert.match(printDoc, /ops-print-memo-label/);
  assert.match(printDoc, /printableMemo/);
  assert.match(printDoc, />메모</);
  assert.match(printDoc, /ops-print-match-kg/);
  assert.match(printDoc, /weightLabel/);

  assert.match(css, /\.ops-print-match-block/);
  assert.match(css, /\.ops-print-memo-row/);
  assert.match(css, /text-overflow:\s*ellipsis/);
  assert.match(
    css,
    /\.ops-print-match-block\s*\{[\s\S]*?border-bottom:\s*1px solid/,
  );
  assert.doesNotMatch(css, /0\.7px/);

  assert.match(printSvc, /formatMatchWeightKgLabel/);
  assert.match(printSvc, /printableMemo/);
  assert.match(format, /printableMemo\?/);
  assert.match(format, /BRACKET_PRINT_MATCHES_PER_PAGE\s*=\s*8/);

  console.log("verify:bracket-pdf-match-memo OK");
  console.log("verify:bracket-pdf-match-weight OK");
  console.log("verify:bracket-pdf-border OK");
}

main();
