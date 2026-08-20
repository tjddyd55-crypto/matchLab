/**
 * 전역 typography token 존재 검증
 *   npm run verify:typography-tokens
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  assert.ok(css.includes("--font-size-base: 1rem"));
  assert.ok(css.includes("--font-size-sm: 0.875rem"));
  assert.ok(css.includes("--font-matchon-sans"));
  assert.ok(css.includes("--font-sans: var(--font-matchon-sans)"));
  assert.ok(css.includes("line-height: var(--line-height-body)"));
  assert.ok(css.includes("Apple SD Gothic Neo"));

  const field = readFileSync(
    join(process.cwd(), "src/lib/ui/matchon-shell-ui.ts"),
    "utf8",
  );
  assert.ok(field.includes("matchonFieldInputClass"));
  assert.ok(field.includes("formControlFieldClass"));

  const formControl = readFileSync(
    join(process.cwd(), "src/lib/ui/form-control-ui.ts"),
    "utf8",
  );
  assert.ok(formControl.includes("text-sm"));
  assert.ok(formControl.includes("formControlFieldClass"));

  console.log("verify:typography-tokens: OK");
}

main();
