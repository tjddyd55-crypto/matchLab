/**
 * Form Control SSOT 토큰·Button compact density 존재 검증.
 *   npm run verify:form-control-ssot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function main() {
  const tokens = read("src/lib/ui/form-control-ui.ts");
  for (const needle of [
    "formControlHeightClass",
    "formControlFieldClass",
    "formControlSelectClass",
    "formControlTextareaClass",
    "formControlSaveButtonClass",
    "formControlLoginInputClass",
    "h-10 min-h-10 md:h-9",
    "h-9 min-h-9 md:h-8",
    "min-h-[80px]",
    "gap-1.5",
  ]) {
    assert.ok(tokens.includes(needle), `missing token: ${needle}`);
  }

  const shell = read("src/lib/ui/matchon-shell-ui.ts");
  assert.ok(shell.includes("formControlFieldClass"));
  assert.ok(shell.includes("matchonFieldInputClass = formControlFieldClass"));

  const button = read("src/components/ui/button.tsx");
  assert.ok(button.includes("md:h-9 md:min-h-9"));
  assert.ok(button.includes("md:h-8 md:min-h-8"));
  assert.ok(button.includes('size: "default"'));
  /** size.default must stay compact (no h-11/h-12 baseline) */
  const sizeBlock = button.match(/size:\s*\{([\s\S]*?)"icon-lg"/);
  assert.ok(sizeBlock, "button size variants missing");
  const defaultSize = sizeBlock![1]!.match(/default:\s*"([^"]+)"/);
  assert.ok(defaultSize, "button size.default missing");
  assert.ok(
    !/\bh-11\b|\bh-12\b/.test(defaultSize![1]!),
    "button size.default must stay compact (no h-11/h-12)",
  );

  const login = read("src/lib/ui/auth-login-ui.ts");
  assert.ok(login.includes("formControlLoginInputClass"));

  console.log("verify:form-control-ssot: OK");
}

main();
