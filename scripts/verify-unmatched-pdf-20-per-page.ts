/**
 * 미매칭 PDF 20명/page + print 품질 정적 검증
 *   npm run verify:unmatched-pdf-20-per-page
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  UNMATCHED_PRINT_ROWS_PER_PAGE,
  buildUnmatchedPrintPages,
} from "../src/lib/brackets/bracket-print-format";

function main() {
  assert.equal(UNMATCHED_PRINT_ROWS_PER_PAGE, 20);

  const format = readFileSync(
    join(process.cwd(), "src/lib/brackets/bracket-print-format.ts"),
    "utf8",
  );
  assert.match(format, /UNMATCHED_PRINT_ROWS_PER_PAGE\s*=\s*20/);

  const pdf = readFileSync(
    join(process.cwd(), "src/lib/brackets/bracket-print-pdf.ts"),
    "utf8",
  );
  assert.match(pdf, /preferCSSPageSize:\s*true/);
  assert.match(pdf, /scale:\s*1/);
  assert.doesNotMatch(pdf, /page\.screenshot/);

  const css = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/bracket-print.css"),
    "utf8",
  );
  assert.match(css, /Noto Sans KR/);
  assert.match(css, /geometricPrecision|antialiased/);
  assert.match(css, /0\.7px/);

  const rows19 = Array.from({ length: 19 }, (_, i) => ({
    index: i + 1,
    gymName: "G",
    fighterName: `F${i}`,
    genderLabel: "남",
    divisionLabel: "중등부 · 남성",
    recordLabel: "0전",
    weightLabel: "60kg",
  }));
  const pages19 = buildUnmatchedPrintPages(rows19);
  assert.equal(pages19.length, 1);
  assert.equal(pages19[0]!.rows.length, 19);

  const rows21 = Array.from({ length: 21 }, (_, i) => ({
    index: i + 1,
    gymName: "G",
    fighterName: `F${i}`,
    genderLabel: "남",
    divisionLabel: "중등부 · 남성",
    recordLabel: "0전",
    weightLabel: "60kg",
  }));
  const pages21 = buildUnmatchedPrintPages(rows21);
  assert.equal(pages21.length, 2);
  assert.equal(pages21[0]!.rows.length, 20);
  assert.equal(pages21[1]!.rows.length, 1);

  console.log("verify:unmatched-pdf-20-per-page OK");
}

main();
