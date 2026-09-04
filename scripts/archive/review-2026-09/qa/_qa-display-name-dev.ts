/**
 * DEV displayName mapping QA — temporary rename then restore.
 *   npx tsx scripts/_qa-display-name-dev.ts
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { memberSportTemplateDisplayName } from "../src/lib/gym-member-profile/display-name";
import { KICKBOXING_TEMPLATE_ID } from "../src/lib/gym-member-profile/types";

async function main() {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const dbUrl = String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
  if (!/yamanote/i.test(dbUrl)) throw new Error("expected yamanote");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const before = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { id: KICKBOXING_TEMPLATE_ID },
  });
  const sportBefore = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const assignBefore = await prisma.gymSportTemplateAssignment.count();

  await prisma.memberSportTemplate.update({
    where: { id: KICKBOXING_TEMPLATE_ID },
    data: {
      name: "킥복싱 테스트 버전 2",
      displayName: "킥복싱",
    },
  });

  const mid = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { id: KICKBOXING_TEMPLATE_ID },
  });
  const shown = memberSportTemplateDisplayName(mid);
  if (shown !== "킥복싱") throw new Error(`display resolver failed: ${shown}`);
  if (mid.name !== "킥복싱 테스트 버전 2") throw new Error("name not set");

  // restore
  await prisma.memberSportTemplate.update({
    where: { id: KICKBOXING_TEMPLATE_ID },
    data: {
      name: before.name === "킥복싱" ? "킥복싱 기본 회원정보" : before.name,
      displayName: "킥복싱",
    },
  });

  const after = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { id: KICKBOXING_TEMPLATE_ID },
  });
  const sportAfter = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });
  const assignAfter = await prisma.gymSportTemplateAssignment.count();

  console.log(
    JSON.stringify(
      {
        shown,
        restoredName: after.name,
        restoredDisplay: after.displayName,
        sportDelta: sportAfter - sportBefore,
        assignDelta: assignAfter - assignBefore,
        templates: await prisma.memberSportTemplate.findMany({
          where: { code: { in: ["KICKBOXING", "BOXING", "TAEKWONDO", "MMA"] } },
          select: {
            code: true,
            name: true,
            displayName: true,
            _count: { select: { fields: true } },
          },
          orderBy: { code: "asc" },
        }),
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
  console.log("QA PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
