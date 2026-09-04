/**
 * Phase 2 Member Grid QA — DEV baseline + migration post-check (READ for baseline).
 * Uses Railway Development (yamanote) only.
 *
 *   npx tsx scripts/_qa-member-grid-phase2-baseline.mts
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const OUT = join(process.cwd(), "test-results", "member-grid-phase2-qa");

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const pgVars = railwayDevPgVars();
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl)) {
    throw new Error("expected Development yamanote DATABASE_PUBLIC_URL");
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const col = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'MemberSportTemplate' AND column_name = 'code'
  `);
  const enumExists = await pool.query(`
    SELECT 1 FROM pg_type WHERE typname = 'MemberSportTemplateCode'
  `);
  const migrations = await pool.query(`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name LIKE '%member_sport%'
       OR migration_name LIKE '%association_schedule%'
       OR migration_name LIKE '%20260903%'
       OR migration_name LIKE '%20260902%'
    ORDER BY migration_name
  `);

  const templates = await prisma.memberSportTemplate.findMany({
    include: { _count: { select: { fields: true, gyms: true } } },
    orderBy: { code: "asc" },
  });
  const sport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const gym = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "GYM" },
  });
  const sample = await prisma.gymMember.findMany({
    where: { deletedAt: null, gymId: "cmq0ux7zq000acwux007f1s1e" },
    take: 5,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      gender: true,
      address: true,
      joinedAt: true,
      memberNumber: true,
      status: true,
      guardianName: true,
      memo: true,
      updatedAt: true,
    },
  });

  const report = {
    at: new Date().toISOString(),
    codeColumn: col.rows,
    enumExists: enumExists.rowCount > 0,
    recentMigrations: migrations.rows,
    templates: templates.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      active: t.active,
      fieldCount: t._count.fields,
      gymCount: t._count.gyms,
    })),
    sportValueCount: sport,
    gymValueCount: gym,
    sampleMembers: sample.map((m) => ({
      ...m,
      birthDate: m.birthDate?.toISOString() ?? null,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      updatedAt: m.updatedAt.toISOString(),
    })),
  };

  writeFileSync(
    join(OUT, "baseline.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
