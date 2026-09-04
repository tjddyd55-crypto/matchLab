/**
 * Production multi-sport migrate baseline + post-check (READ ONLY except migrate deploy separate).
 *   npx tsx scripts/_prod-multi-sport-baseline.ts
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_PG = "9133eb46-6e18-4596-a374-babb4311f75a";

function railwayProdPgUrl(): string {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${PROD_PG} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
}

async function main() {
  const dbUrl = railwayProdPgUrl();
  if (!/yamabiko/i.test(dbUrl)) throw new Error("REFUSING: expected yamabiko");
  if (/yamanote/i.test(dbUrl)) throw new Error("REFUSING: yamanote");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const kick = await prisma.memberSportTemplate.findUnique({
    where: { id: "cmskickboxingtpl001" },
    include: { _count: { select: { fields: true } } },
  });

  const gymCount = await prisma.gym.count();
  const legacyPairs = await prisma.gym.findMany({
    where: { memberSportTemplateId: { not: null } },
    select: {
      id: true,
      name: true,
      memberSportTemplateId: true,
    },
    orderBy: { id: "asc" },
  });

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (
         'GymSportTemplateAssignment',
         'GymApplicationSportTemplate',
         'GymMemberSportTemplateAssignment'
       )
     ORDER BY table_name`,
  );

  let assignmentCount: number | null = null;
  let assignmentPairs: Array<{ gymId: string; templateId: string; isActive: boolean }> =
    [];
  let memberAssignmentCount: number | null = null;
  let memberAssignmentDupes: number | null = null;
  let applicationSelectionCount: number | null = null;

  if (tables.rows.some((r) => r.table_name === "GymSportTemplateAssignment")) {
    assignmentCount = await prisma.gymSportTemplateAssignment.count();
    assignmentPairs = await prisma.gymSportTemplateAssignment.findMany({
      select: { gymId: true, templateId: true, isActive: true },
      orderBy: [{ gymId: "asc" }, { templateId: "asc" }],
    });
  }
  if (
    tables.rows.some((r) => r.table_name === "GymMemberSportTemplateAssignment")
  ) {
    memberAssignmentCount = await prisma.gymMemberSportTemplateAssignment.count();
    const dup = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM (
         SELECT "gymMemberId", "templateId"
         FROM "GymMemberSportTemplateAssignment"
         GROUP BY 1, 2
         HAVING COUNT(*) > 1
       ) d`,
    );
    memberAssignmentDupes = Number(dup.rows[0]?.c ?? 0);
  }
  if (tables.rows.some((r) => r.table_name === "GymApplicationSportTemplate")) {
    applicationSelectionCount = await prisma.gymApplicationSportTemplate.count();
  }

  const legacyCol = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'Gym' AND column_name = 'memberSportTemplateId'`,
  );

  const out = {
    hostOk: /yamabiko/i.test(dbUrl),
    kickboxing: kick
      ? {
          id: kick.id,
          code: kick.code,
          active: kick.active,
          fieldCount: kick._count.fields,
        }
      : null,
    gymCount,
    legacyAssignmentCount: legacyPairs.length,
    legacyPairs,
    tablesPresent: tables.rows.map((r) => r.table_name),
    assignmentCount,
    assignmentPairs,
    memberAssignmentCount,
    memberAssignmentDupes,
    applicationSelectionCount,
    legacyColumnPresent: legacyCol.rows.length === 1,
    gymMember: await prisma.gymMember.count(),
    sport: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "SPORT" },
    }),
    gymVals: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "GYM" },
    }),
    eventApplication: await prisma.eventApplication.count(),
    bracketMatch: await prisma.bracketMatch.count(),
    fighter: await prisma.fighter.count(),
    matchResult: await prisma.matchResult.count(),
    gymApplication: await prisma.gymApplication.count(),
  };

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
