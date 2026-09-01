/**
 * Fighter Career — EventApplication / bracket snapshot data safety (static)
 *
 * Ensures Career development does NOT:
 * - update EventApplication snapshots
 * - inject MatchResult live record into bracket/seeding
 * - backfill/sync application data from Fighter or MatchResult
 *
 *   npx tsx scripts/verify-fighter-career-application-snapshot-safety.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

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

/** Career Phase files — must stay read-only for EventApplication. */
const CAREER_PATH_PREFIXES = [
  "src/lib/services/fighter-unified-profile.service.ts",
  "src/lib/services/fighter-external-record.service.ts",
  "src/lib/fighter-unified-profile/",
  "src/components/domain/fighters/career/",
  "src/lib/ui/fighter-career-ui.ts",
];

const FORBIDDEN_WRITE_PATTERNS = [
  /eventApplication\.update\b/,
  /eventApplication\.updateMany\b/,
  /winsSnapshot\s*:/, // assignment in update data — allowed in create only; flag in career files
];

/** Bracket / seeding must not import unified Career calculators. */
const BRACKET_PATH_PREFIXES = [
  "src/lib/services/bracket-auto-match.service.ts",
  "src/lib/services/bracket.service.ts",
  "src/lib/services/match.service.ts",
  "src/lib/brackets/",
  "src/lib/repositories/bracket.repository.ts",
];

const FORBIDDEN_BRACKET_IMPORTS = [
  /fighter-unified-profile/,
  /fighterUnifiedProfileService/,
  /computeOfficialRecordFromResults/,
  /loadOfficialRecord/,
  /externalRecord/,
];

function assertCareerFilesReadOnly() {
  for (const prefix of CAREER_PATH_PREFIXES) {
    const path = join(process.cwd(), prefix);
    let files: string[];
    try {
      const st = statSync(path);
      files = st.isDirectory()
        ? listTsFiles(path).map((f) => f.replace(process.cwd().replace(/\\/g, "/") + "/", ""))
        : [prefix];
    } catch {
      continue;
    }

    for (const rel of files) {
      const src = read(rel);
      assert.doesNotMatch(
        src,
        /eventApplication\.update\b/,
        `${rel} must not update EventApplication`,
      );
      assert.doesNotMatch(
        src,
        /eventApplication\.updateMany\b/,
        `${rel} must not bulk-update EventApplication`,
      );
      assert.doesNotMatch(
        src,
        /\.eventApplication\.(create|upsert|delete)/,
        `${rel} must not mutate EventApplication rows`,
      );
    }
  }
}

function assertBracketUsesApplicationSnapshot() {
  const explain = read("src/lib/brackets/explain-record-unmatched.ts");
  assert.match(
    explain,
    /formatPreviewApplicationRecord/,
    "formatPreviewApplicationRecord must exist",
  );
  assert.match(
    explain,
    /hasStructuredSnapshot/,
    "snapshot-first record resolution required",
  );
  assert.match(
    explain,
    /winsSnapshot/,
    "winsSnapshot must be referenced",
  );

  for (const prefix of BRACKET_PATH_PREFIXES) {
    let files: string[];
    try {
      const full = join(process.cwd(), prefix);
      const st = statSync(full);
      files = st.isDirectory()
        ? listTsFiles(full).map((f) =>
            f.replace(process.cwd().replace(/\\/g, "/") + "/", ""),
          )
        : [prefix];
    } catch {
      continue;
    }

    for (const rel of files) {
      const src = read(rel);
      for (const pattern of FORBIDDEN_BRACKET_IMPORTS) {
        assert.doesNotMatch(
          src,
          pattern,
          `${rel} must not import unified Career SSOT (bracket uses application snapshot)`,
        );
      }
    }
  }

  const autoMatch = read("src/lib/services/bracket-auto-match.service.ts");
  assert.match(autoMatch, /formatPreviewApplicationRecord/);
  assert.match(autoMatch, /winsSnapshot: row\.winsSnapshot/);
}

function assertMatchResultRecalcDoesNotTouchApplications() {
  const resultRepo = read("src/lib/repositories/result.repository.ts");
  assert.match(resultRepo, /recalculateOneFighterRecordCache/);
  assert.match(resultRepo, /updateFighterRecordCache/);
  assert.doesNotMatch(
    resultRepo,
    /eventApplication/,
    "MatchResult recalc must not touch EventApplication",
  );
}

function assertUnifiedServiceIsLoadOnly() {
  const svc = read("src/lib/services/fighter-unified-profile.service.ts");
  assert.match(svc, /listApplicationsForFighter/);
  assert.match(svc, /listResultsByFighter/);
  assert.doesNotMatch(svc, /\.update\(/);
  assert.doesNotMatch(svc, /\.updateMany\(/);
  assert.doesNotMatch(svc, /\.create\(/);
  assert.doesNotMatch(svc, /\.delete\(/);
}

function assertCareerDiffDoesNotTouchBracketOrApplicationRepos() {
  const touched = [
    "src/lib/repositories/application.repository.ts",
    "src/lib/repositories/bracket.repository.ts",
    "src/lib/services/bracket-auto-match.service.ts",
    "src/lib/services/bracket.service.ts",
    "src/lib/brackets/explain-record-unmatched.ts",
    "src/lib/services/application.service.ts",
  ];
  for (const rel of touched) {
    const src = read(rel);
    assert.doesNotMatch(
      src,
      /fighter-unified-profile/,
      `${rel} must not depend on unified Career (pre-existing bracket path)`,
    );
  }
}

function assertSnapshotFieldsExistInSchema() {
  const schema = read("prisma/schema.prisma");
  for (const field of [
    "winsSnapshot",
    "lossesSnapshot",
    "drawsSnapshot",
    "totalBoutsSnapshot",
    "fighterSnapshot",
    "gymSnapshot",
  ]) {
    assert.match(schema, new RegExp(field), `schema must define ${field}`);
  }
}

function assertFighterRecordCacheDocumented() {
  const schema = read("prisma/schema.prisma");
  assert.match(
    schema,
    /MatchResult 재집계 캐시/,
    "Fighter.record* must remain MatchResult cache only",
  );
}

function assertExternalUpdateDoesNotTouchApplicationsOrResults() {
  const svc = read("src/lib/services/fighter-external-record.service.ts");
  assert.match(svc, /updateExternalRecord/);
  assert.doesNotMatch(svc, /eventApplication/);
  assert.doesNotMatch(svc, /bracketMatch/i);
  assert.doesNotMatch(svc, /matchResult/i);

  const unified = read("src/lib/services/fighter-unified-profile.service.ts");
  assert.match(unified, /combinedRecord/);
  assert.match(unified, /computeCombinedRecord/);
  assert.doesNotMatch(unified, /fighter\.update/);
  assert.doesNotMatch(unified, /\.fighter\.create/);
}

function assertApplicationSnapshotGeneratorUnchanged() {
  const appSvc = read("src/lib/services/application.service.ts");
  assert.doesNotMatch(
    appSvc,
    /fighter-unified-profile/,
    "application service must not import unified Career",
  );
  assert.doesNotMatch(
    appSvc,
    /loadCareerBreakdown/,
    "application snapshot must not auto-inject unified Career",
  );
}

function main() {
  assertCareerFilesReadOnly();
  assertUnifiedServiceIsLoadOnly();
  assertMatchResultRecalcDoesNotTouchApplications();
  assertBracketUsesApplicationSnapshot();
  assertCareerDiffDoesNotTouchBracketOrApplicationRepos();
  assertSnapshotFieldsExistInSchema();
  assertFighterRecordCacheDocumented();
  assertExternalUpdateDoesNotTouchApplicationsOrResults();
  assertApplicationSnapshotGeneratorUnchanged();

  console.log("verify-fighter-career-application-snapshot-safety: PASS");
  console.log("  - Career services: EventApplication write-free");
  console.log("  - External update: EventApplication/BracketMatch/MatchResult write-free");
  console.log("  - Bracket paths: no unified Career injection");
  console.log("  - MatchResult recalc: EventApplication untouched");
  console.log("  - Application snapshot fields: schema present");
}

main();
