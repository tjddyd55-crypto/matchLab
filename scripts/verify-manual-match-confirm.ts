/**
 * Manual match confirm flow
 *   npm run verify:manual-match-confirm
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const panel = readFileSync(
    join(process.cwd(), "src/components/domain/brackets/ManualMatchCreatePanel.tsx"),
    "utf8",
  );

  assert.match(panel, /경기를 생성할까요\?/);
  assert.match(panel, /경기 생성/);
  assert.match(panel, /confirmPairKeyRef/);
  // cancel keeps slots — only clears confirmPairKeyRef
  assert.match(panel, /confirmPairKeyRef\.current = null/);
  assert.equal(panel.includes("window.confirm"), false);
  // create only after confirm
  assert.match(panel, /if \(!ok\)/);
  assert.match(panel, /createManualMatchWithPairAction/);

  console.log("verify:manual-match-confirm OK");
}

main();
