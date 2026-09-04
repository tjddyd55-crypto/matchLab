/**
 * Production READ ONLY baseline for member sport template code-string migrate.
 *   npx tsx scripts/_prod-member-template-code-baseline.ts
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
  const vars = JSON.parse(raw) as Record<string, string>;
  return String(vars.DATABASE_PUBLIC_URL || "");
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
    include: {
      _count: { select: { fields: true } },
    },
    orderBy: { code: "asc" },
  });

  const kick = templates.find((t) => t.id === "cmskickboxingtpl001");
  const gymAssigned = await prisma.gym.count({
    where: { memberSportTemplateId: { not: null } },
  });
  const gymAssignedList = await prisma.gym.findMany({
    where: { memberSportTemplateId: { not: null } },
    select: {
      id: true,
      name: true,
      memberSportTemplateId: true,
    },
    take: 50,
  });

  const gymMember = await prisma.gymMember.count();
  const sport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const gymVals = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "GYM" },
  });

  const codeCol = await pool.query<{ data_type: string; udt_name: string }>(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_name = 'MemberSportTemplate' AND column_name = 'code'`,
  );

  console.log(
    JSON.stringify(
      {
        hostOk: /yamabiko/i.test(dbUrl),
        codeColumn: codeCol.rows[0] ?? null,
        templates: templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          active: t.active,
          fieldCount: t._count.fields,
        })),
        kickboxing: kick
          ? {
              id: kick.id,
              code: kick.code,
              fieldCount: kick._count.fields,
              active: kick.active,
            }
          : null,
        gymAssignedCount: gymAssigned,
        gymAssignedSample: gymAssignedList,
        gymMember,
        sport,
        gymVals,
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
