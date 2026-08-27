/**
 * Figma 11:3 기준 — 대진표 PDF row는 flat 4-col grid + continuous borders
 *   npm run verify:bracket-pdf-row-grid
 *   npm run verify:bracket-pdf-continuous-borders
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const printDoc = readFileSync(
  join(root, "src/components/domain/brackets/BracketPrintDocument.tsx"),
  "utf8",
);
const css = readFileSync(
  join(root, "src/components/domain/brackets/bracket-print.css"),
  "utf8",
);

function main() {
  // Flat row: 번호 | RED | VS | BLUE — nested fighters wrapper 금지
  assert.match(printDoc, /className="ops-print-row"/);
  assert.match(printDoc, /ops-print-match-no-cell/);
  assert.match(printDoc, /ops-print-vs/);
  assert.match(printDoc, /<FighterCorner\s+fighter=\{match\.red\}/);
  assert.match(printDoc, /<FighterCorner\s+fighter=\{match\.blue\}/);
  assert.doesNotMatch(printDoc, /ops-print-fighters/);

  assert.match(
    css,
    /grid-template-columns:\s*\n?\s*var\(--bracket-print-no-w\)\s+minmax\(0,\s*1fr\)\s+var\(--bracket-print-vs-w\)/,
  );
  assert.match(css, /--bracket-print-row-h:\s*78px/);
  assert.match(css, /--bracket-print-no-w:\s*54px/);
  assert.match(css, /--bracket-print-vs-w:\s*34px/);
  assert.match(css, /\.ops-print-row\s*\{[\s\S]*?height:\s*var\(--bracket-print-row-h\)/);

  // Border ownership: list outer + match-block bottom (memo row 포함)
  assert.match(css, /\.ops-print-list\s*\{[\s\S]*?border:\s*1px solid/);
  assert.match(
    css,
    /\.ops-print-match-block\s*\{[\s\S]*?border-bottom:\s*1px solid/,
  );
  assert.doesNotMatch(css, /border-bottom-width:\s*0/);
  assert.doesNotMatch(css, /0\.7px/);
  assert.match(printDoc, /ops-print-match-block/);
  assert.match(printDoc, /ops-print-memo-row/);

  // Figma: no gray vertical between RED|VS|BLUE — only colored edge bars
  assert.match(
    css,
    /\.ops-print-corner-red\s*\{[\s\S]*?border-left:\s*var\(--bracket-print-edge-w\)/,
  );
  assert.match(
    css,
    /\.ops-print-corner-blue\s*\{[\s\S]*?border-right:\s*var\(--bracket-print-edge-w\)/,
  );
  assert.match(css, /\.ops-print-vs\s*\{[\s\S]*?border:\s*none/);
  assert.match(css, /\.ops-print-corner-red\s*\{[\s\S]*?border-right:\s*none/);

  // No transform/scale hacks
  assert.doesNotMatch(css, /transform:\s*scale/);
  assert.doesNotMatch(css, /\bzoom\s*:/);

  // Print keeps Figma tint colors (not grayscale override)
  assert.match(css, /--bracket-print-red-bg:\s*#fff6f6/);
  assert.match(css, /--bracket-print-blue-bg:\s*#f6faff/);
  assert.match(css, /--bracket-print-red-line:\s*#cc1c17/);
  assert.match(css, /--bracket-print-blue-line:\s*#085499/);
  assert.doesNotMatch(
    css,
    /\.ops-print-corner-red\s*\{\s*background:\s*#f2f2f2\s*!important/,
  );

  // Flex label (absolute 남발 금지)
  assert.match(printDoc, /ops-print-corner-main/);
  assert.match(css, /\.ops-print-corner-label/);
  assert.doesNotMatch(css, /\.ops-print-corner-label\s*\{[\s\S]*?position:\s*absolute/);

  console.log("verify:bracket-pdf-row-grid OK");
  console.log("verify:bracket-pdf-continuous-borders OK");
}

main();
