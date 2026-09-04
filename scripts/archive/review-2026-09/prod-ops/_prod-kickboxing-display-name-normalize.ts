/**
 * Production READ + KICKBOXING metadata-only normalize (no new template seed).
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { KICKBOXING_TEMPLATE_ID } from "../src/lib/gym-member-profile/types";

async function main() {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0b2a6288-f6c4-445e-b898-0bbb22acaffa --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const dbUrl = String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
  if (!/yamabiko/i.test(dbUrl)) throw new Error("yamabiko required");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const before = {
    gymMember: await prisma.gymMember.count(),
    sport: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "SPORT" },
    }),
    gym: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "GYM" },
    }),
    assignment: await prisma.gymSportTemplateAssignment.count(),
    templates: await prisma.memberSportTemplate.count(),
  };

  const kick = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { id: KICKBOXING_TEMPLATE_ID },
    include: { _count: { select: { fields: true } } },
  });

  const patch: { name?: string; displayName?: string } = {};
  if (kick.name.trim() === "킥복싱") {
    patch.name = "킥복싱 기본 회원정보";
  }
  if (
    !kick.displayName?.trim() ||
    kick.displayName.trim().toLowerCase() === "kickboxing" ||
    kick.displayName.trim() === "킥복싱" ||
    kick.displayName.trim() === kick.name.trim()
  ) {
    patch.displayName = "킥복싱";
  }
  // Always ensure displayName is Korean 킥복싱 if still kickboxing english
  if (kick.displayName.trim().toLowerCase() === "kickboxing") {
    patch.displayName = "킥복싱";
  }

  if (Object.keys(patch).length > 0) {
    await prisma.memberSportTemplate.update({
      where: { id: kick.id },
      data: patch,
    });
  }

  const afterKick = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { id: KICKBOXING_TEMPLATE_ID },
    include: { _count: { select: { fields: true } } },
  });

  const after = {
    gymMember: await prisma.gymMember.count(),
    sport: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "SPORT" },
    }),
    gym: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "GYM" },
    }),
    assignment: await prisma.gymSportTemplateAssignment.count(),
    templates: await prisma.memberSportTemplate.count(),
  };

  console.log(
    JSON.stringify(
      {
        kickBefore: {
          name: kick.name,
          displayName: kick.displayName,
          fields: kick._count.fields,
        },
        kickAfter: {
          name: afterKick.name,
          displayName: afterKick.displayName,
          fields: afterKick._count.fields,
        },
        patch,
        allTemplates: await prisma.memberSportTemplate.findMany({
          select: { code: true, name: true, displayName: true },
        }),
        deltas: {
          gymMember: after.gymMember - before.gymMember,
          sport: after.sport - before.sport,
          gym: after.gym - before.gym,
          assignment: after.assignment - before.assignment,
          templates: after.templates - before.templates,
        },
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
