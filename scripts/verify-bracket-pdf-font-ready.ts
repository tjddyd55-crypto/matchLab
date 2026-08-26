/**
 * Playwright PDF 생성 전 document.fonts.ready 대기
 *   npm run verify:bracket-pdf-font-ready
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const pdf = readFileSync(
    join(process.cwd(), "src/lib/brackets/bracket-print-pdf.ts"),
    "utf8",
  );
  const css = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/bracket-print.css"),
    "utf8",
  );

  assert.match(pdf, /document\.fonts\.ready/);
  assert.match(pdf, /waitUntil:\s*"networkidle"/);
  assert.match(pdf, /printBackground:\s*true/);
  assert.match(pdf, /preferCSSPageSize:\s*true/);
  assert.match(pdf, /scale:\s*1/);
  assert.match(pdf, /format:\s*"A4"/);
  assert.match(pdf, /6mm/);
  assert.doesNotMatch(pdf, /scale:\s*0\.\d/);

  assert.match(css, /Noto Sans KR/);
  assert.match(css, /fonts\.googleapis\.com.*Noto\+Sans\+KR/);

  console.log("verify:bracket-pdf-font-ready OK");
}

main();
