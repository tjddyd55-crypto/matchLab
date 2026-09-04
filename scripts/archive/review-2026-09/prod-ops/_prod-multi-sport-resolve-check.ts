/**
 * Production READ-only service path check for multi-sport resolve.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { resolveGymActiveSportTemplates } from "../src/lib/repositories/gym-sport-template.repository";

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_PG = "9133eb46-6e18-4596-a374-babb4311f75a";
const GYM_ID = "cmsit3cjd00010po9dlgurpip";

async function main() {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${PROD_PG} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const dbUrl = String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
  if (!/yamabiko/i.test(dbUrl)) throw new Error("not yamabiko");

  process.env.DATABASE_URL = dbUrl;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  // Force prisma singleton? resolve uses imported prisma — set DATABASE_URL before import won't work since already imported.
  // Use direct queries mirroring resolve instead.
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const assignments = await prisma.gymSportTemplateAssignment.findMany({
    where: { gymId: GYM_ID, isActive: true },
    include: {
      template: {
        include: {
          fields: {
            where: { active: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });
  const active = assignments.filter((a) => a.template.active);
  const gym = await prisma.gym.findUnique({
    where: { id: GYM_ID },
    select: { memberSportTemplateId: true },
  });

  const kickUsage = await prisma.gymSportTemplateAssignment.count({
    where: { templateId: "cmskickboxingtpl001", isActive: true },
  });

  console.log(
    JSON.stringify(
      {
        assignmentActive: active.map((a) => ({
          code: a.template.code,
          name: a.template.name,
          fieldCount: a.template.fields.length,
        })),
        legacyFk: gym?.memberSportTemplateId,
        legacyFallbackWouldUse:
          active.length === 0 ? gym?.memberSportTemplateId ?? null : null,
        kickboxingActiveGymCount: kickUsage,
        pairMatch:
          active.length === 1 &&
          active[0]?.template.id === "cmskickboxingtpl001" &&
          gym?.memberSportTemplateId === "cmskickboxingtpl001",
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
  void resolveGymActiveSportTemplates;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
