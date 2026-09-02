/**
 * Form/schedule data safety — no EventApplication/Fighter/Bracket writes
 *   npx tsx scripts/verify-form-schedule-data-safety.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT_PREFIXES = [
  "src/lib/services/intake-form.service.ts",
  "src/lib/services/intake-form-excel-export.service.ts",
  "src/lib/services/association-schedule.service.ts",
  "src/lib/repositories/intake-form.repository.ts",
  "src/lib/repositories/association-schedule.repository.ts",
  "src/lib/intake-form/",
  "src/lib/association-schedule/",
  "src/features/intake-forms/",
  "src/features/association-schedules/",
  "src/components/domain/intake-forms/",
  "src/components/domain/association-schedules/",
];

const FORBIDDEN = [
  /eventApplication\.update\b/,
  /eventApplication\.updateMany\b/,
  /bracketMatch\.update\b/,
  /fighter\.update\b/,
  /matchResult\.update\b/,
];

function listTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      listTsFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

const cwd = process.cwd().replace(/\\/g, "/");
for (const prefix of ROOT_PREFIXES) {
  const path = join(process.cwd(), prefix);
  let files: string[];
  try {
    const st = statSync(path);
    files = st.isDirectory()
      ? listTsFiles(path).map((f) => f.replace(cwd + "/", ""))
      : [prefix];
  } catch {
    continue;
  }
  for (const rel of files) {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(
        src,
        pattern,
        `${rel} must not contain ${pattern}`,
      );
    }
  }
}

console.log("verify-form-schedule-data-safety: OK");
