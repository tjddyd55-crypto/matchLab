/**
 * PR #53 db:push 후 schema 반영 확인 (additive, db:seed 금지).
 *
 * Railway Shell:
 *   npm run verify:judge-schema
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const REQUIRED_COLUMNS: Record<string, string[]> = {
  JudgeAccessCredential: [
    "role",
    "verifiedName",
    "birthDate",
    "phone",
    "organization",
    "identityConfirmedAt",
    "identityConfirmedIp",
    "identityConfirmedUserAgent",
  ],
  JudgeScorecard: [
    "credentialId",
    "judgeName",
    "judgeBirthDateSnapshot",
    "judgeRoleSnapshot",
    "submittedAt",
    "submittedIp",
    "submittedUserAgent",
    "status",
  ],
};

const REQUIRED_TABLES = ["JudgeScorecardChangeLog"];

const REQUIRED_ENUM_TYPES = [
  "JudgeCredentialRole",
  "JudgeScorecardRevisionAction",
];

async function enumTypeExists(enumName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = ${enumName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
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
      WHERE t.typname = ${enumName}
        AND e.enumlabel = ${value}
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

  console.log("=== Judge schema verification (post db:push) ===\n");

  let failed = 0;

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const col of columns) {
      const ok = await columnExists(table, col);
      console.log(`${ok ? "OK" : "FAIL"} column ${table}.${col}`);
      if (!ok) failed += 1;
    }
  }

  for (const table of REQUIRED_TABLES) {
    const ok = await tableExists(table);
    console.log(`${ok ? "OK" : "FAIL"} table ${table}`);
    if (!ok) failed += 1;
  }

  const revisedOk = await enumHasValue("JudgeScorecardStatus", "revised");
  console.log(`${revisedOk ? "OK" : "FAIL"} enum JudgeScorecardStatus.revised`);
  if (!revisedOk) failed += 1;

  for (const enumName of REQUIRED_ENUM_TYPES) {
    const ok = await enumTypeExists(enumName);
    console.log(`${ok ? "OK" : "FAIL"} enum type ${enumName}`);
    if (!ok) failed += 1;
  }

  console.log("\n--- Existing data row counts (must be preserved on prod) ---");
  for (const table of [
    "JudgeAccessCredential",
    "JudgeScorecard",
    "JudgeMatchAssignment",
    "MatchResult",
    "BracketMatch",
  ]) {
    try {
      const count = await countTable(table);
      console.log(`${table}: ${count}`);
    } catch (e) {
      console.log(`${table}: (skip) ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\n--- Prisma smoke read ---");
  await prisma.judgeAccessCredential.findFirst({ select: { id: true, role: true } });
  await prisma.judgeScorecard.findFirst({
    select: { id: true, credentialId: true, judgeName: true },
  });
  await prisma.judgeScorecardChangeLog.findFirst({ select: { id: true } });
  console.log("OK Prisma queries (no P2022)");

  if (failed > 0) {
    console.error(`\nFAILED: ${failed} check(s)`);
    process.exit(1);
  }

  console.log("\nAll schema checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
