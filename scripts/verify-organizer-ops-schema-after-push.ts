/**
 * PR #56 db:push 후 additive schema 반영 확인 (db:seed / reset / truncate 금지).
 *
 * Railway Shell:
 *   npm run verify:organizer-ops-schema
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const REQUIRED_TABLES = ["EventCourt", "EventCourtDivisionRule"];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  EventApplication: [
    "weighInFailureResolution",
    "handicapNote",
    "disqualificationReason",
    "cancellationSource",
  ],
  BracketMatch: ["courtId", "courtOrder"],
  EventCourtDivisionRule: [
    "divisionId",
    "weightClassLabel",
    "priority",
    "isActive",
  ],
};

const REQUIRED_ENUMS: { type: string; values: string[] }[] = [
  {
    type: "WeighInFailureResolution",
    values: ["pending", "proceed_with_handicap", "cancel_match"],
  },
  {
    type: "ApplicationCancellationSource",
    values: ["gym", "organizer", "system"],
  },
];

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function enumTypeExists(enumName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = ${enumName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function enumHasValue(enumName: string, value: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = ${enumName} AND e.enumlabel = ${value}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function countTable(table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL가 필요합니다.");
  }

  console.log("=== Organizer ops schema verification (post db:push) ===\n");

  let failed = 0;

  for (const table of REQUIRED_TABLES) {
    const ok = await tableExists(table);
    console.log(`${ok ? "OK" : "FAIL"} table ${table}`);
    if (!ok) failed += 1;
  }

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const col of columns) {
      const ok = await columnExists(table, col);
      console.log(`${ok ? "OK" : "FAIL"} column ${table}.${col}`);
      if (!ok) failed += 1;
    }
  }

  for (const { type, values } of REQUIRED_ENUMS) {
    const typeOk = await enumTypeExists(type);
    console.log(`${typeOk ? "OK" : "FAIL"} enum type ${type}`);
    if (!typeOk) failed += 1;
    for (const v of values) {
      const ok = await enumHasValue(type, v);
      console.log(`${ok ? "OK" : "FAIL"} enum ${type}.${v}`);
      if (!ok) failed += 1;
    }
  }

  console.log("\n--- Existing data row counts (must be preserved) ---");
  for (const table of [
    "Event",
    "EventApplication",
    "Bracket",
    "BracketMatch",
    "MatchResult",
    "JudgeAccessCredential",
  ]) {
    try {
      const count = await countTable(table);
      console.log(`${table}: ${count}`);
    } catch (e) {
      console.log(`${table}: (skip) ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\n--- Prisma smoke read ---");
  await prisma.eventCourt.findFirst({ select: { id: true, name: true } });
  await prisma.eventCourtDivisionRule.findFirst({
    select: {
      id: true,
      divisionId: true,
      weightClassLabel: true,
    },
  });
  await prisma.eventApplication.findFirst({
    select: {
      id: true,
      weighInFailureResolution: true,
      cancellationSource: true,
    },
  });
  await prisma.bracketMatch.findFirst({
    select: { id: true, courtId: true, courtOrder: true },
  });
  console.log("OK Prisma queries (no P2022)");

  if (failed > 0) {
    console.error(`\nFAILED: ${failed} check(s)`);
    process.exit(1);
  }

  console.log("\nAll organizer-ops schema checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
