/**
 * Runtime match weight is matchWeightKg only — no memo fallback.
 *   npm run verify:match-weight-runtime-ssot
 *   npm run verify:match-weight-no-legacy-fallback
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  extractMatchWeightFromMemo,
  formatMatchWeightKgLabel,
} from "../src/lib/brackets/extract-match-weight-from-memo";

const root = process.cwd();

const RUNTIME_ROOTS = [
  "src/components",
  "src/features",
  "src/lib/services",
  "src/app",
];

const ALLOWED_EXTRACT_FILES = new Set([
  join(root, "src/lib/brackets/extract-match-weight-from-memo.ts"),
]);

function walkTsFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function main() {
  const helpers = readFileSync(
    join(root, "src/lib/brackets/extract-match-weight-from-memo.ts"),
    "utf8",
  );
  assert.match(helpers, /Legacy migration\/backfill only/);
  assert.doesNotMatch(helpers, /transition fallback/);
  assert.doesNotMatch(helpers, /function resolveMatchWeightLabel/);
  assert.doesNotMatch(helpers, /function resolveMatchWeightKgValue/);

  // field SSOT formatter
  assert.equal(formatMatchWeightKgLabel(70), "70kg");
  assert.equal(formatMatchWeightKgLabel(null), null);
  // memo still extractable for backfill utility — but must not drive null field
  assert.equal(extractMatchWeightFromMemo("68kg / 운영 메모"), "68kg");
  assert.equal(formatMatchWeightKgLabel(null), null);

  const card = readFileSync(
    join(root, "src/components/domain/brackets/OrganizerMatchEditCard.tsx"),
    "utf8",
  );
  const printSvc = readFileSync(
    join(root, "src/lib/services/bracket-print.service.ts"),
    "utf8",
  );

  assert.match(card, /formatMatchWeightKgInputValue\(match\.matchWeightKg\)/);
  assert.doesNotMatch(card, /extractMatchWeight/);
  assert.doesNotMatch(card, /resolveMatchWeight/);
  assert.match(printSvc, /formatMatchWeightKgLabel\(m\.matchWeightKg\)/);
  assert.doesNotMatch(printSvc, /resolveMatchWeightLabel/);
  assert.doesNotMatch(printSvc, /extractMatchWeightFromMemo/);

  const offenders: string[] = [];
  for (const base of RUNTIME_ROOTS) {
    for (const file of walkTsFiles(join(root, base))) {
      if (ALLOWED_EXTRACT_FILES.has(file)) continue;
      const text = readFileSync(file, "utf8");
      if (
        /extractMatchWeightFromMemo\s*\(/.test(text) ||
        /extractMatchWeightKgFromMemo\s*\(/.test(text) ||
        /resolveMatchWeightLabel\s*\(/.test(text) ||
        /resolveMatchWeightKgValue\s*\(/.test(text)
      ) {
        offenders.push(file.replace(root + "\\", "").replace(root + "/", ""));
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `runtime extract/resolve fallback calls: ${offenders.join(", ")}`,
  );

  console.log("verify:match-weight-runtime-ssot OK");
  console.log("verify:match-weight-no-legacy-fallback OK");
}

main();
