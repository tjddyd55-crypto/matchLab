/**
 * backfill 스크립트 가드: overwrite 금지 · memo 미삭제 · yamanote only
 *   npm run verify:match-weight-backfill
 *   npm run verify:match-weight-no-overwrite
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractMatchWeightKgFromMemo } from "../src/lib/brackets/extract-match-weight-from-memo";

function main() {
  const root = process.cwd();
  const script = readFileSync(
    join(root, "scripts/backfill-match-weight-from-memo.mts"),
    "utf8",
  );

  assert.match(script, /assertYamanote|yamanote/);
  assert.match(script, /yamabiko/);
  assert.match(script, /matchWeightKg:\s*null/);
  assert.match(script, /extractMatchWeightKgFromMemo/);
  assert.doesNotMatch(script, /organizerMemo:\s*\{/);
  assert.doesNotMatch(script, /data:\s*\{[^}]*organizerMemo/);

  // no-overwrite semantics: field wins over memo extract for display SSOT
  assert.equal(extractMatchWeightKgFromMemo("68kg / old memo"), 68);

  // legacy patterns (backfill helper only)
  assert.equal(extractMatchWeightKgFromMemo("68kg"), 68);
  assert.equal(extractMatchWeightKgFromMemo("42.5kg"), 42.5);
  assert.equal(extractMatchWeightKgFromMemo("68kg / 결승전"), 68);
  assert.equal(extractMatchWeightKgFromMemo("결승전"), null);

  console.log("verify:match-weight-backfill OK");
  console.log("verify:match-weight-no-overwrite OK");
}

main();
