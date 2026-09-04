/**
 * Production default sport template seed baseline + post-check (READ).
 *   npx tsx scripts/_prod-default-sport-seed-baseline.ts
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

  const templates = await prisma.memberSportTemplate.findMany({
    include: { _count: { select: { fields: true } } },
    orderBy: { code: "asc" },
  });

  const kickAssignments = await prisma.gymSportTemplateAssignment.findMany({
    where: { isActive: true },
    include: {
      gym: { select: { id: true, name: true } },
      template: { select: { code: true, displayName: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        hostOk: /yamabiko/i.test(dbUrl),
        templates: templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          displayName: t.displayName,
          active: t.active,
          fieldCount: t._count.fields,
        })),
        gymSportTemplateAssignment: await prisma.gymSportTemplateAssignment.count(),
        gymMemberSportTemplateAssignment:
          await prisma.gymMemberSportTemplateAssignment.count(),
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
        activeAssignments: kickAssignments.map((a) => ({
          gymId: a.gymId,
          gymName: a.gym.name,
          code: a.template.code,
          displayName: a.template.displayName,
        })),
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
