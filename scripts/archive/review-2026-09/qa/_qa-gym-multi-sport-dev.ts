/**
 * DEV QA for multi-sport — yamanote READ-mostly (creates QA template + cleanup).
 * Does NOT touch Fighter/EventApplication/BracketMatch/MatchResult.
 *   npx tsx scripts/_qa-gym-multi-sport-dev.ts
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DEV_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const DEV_ENV = "0a52e3d5-efac-4265-9b0c-c878ebf39b8f";
const DEV_PG = "9133eb46-6e18-4596-a374-babb4311f75a";
const QA_CODE = "TAEKWONDO_QA";

function railwayDevUrl(): string {
  const raw = execSync(
    `railway variables --project ${DEV_PROJECT} --environment ${DEV_ENV} --service ${DEV_PG} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
}

async function main() {
  const dbUrl = railwayDevUrl();
  if (!/yamanote/i.test(dbUrl)) throw new Error("expected yamanote");

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
    fighter: await prisma.fighter.count(),
    app: await prisma.eventApplication.count(),
    match: await prisma.bracketMatch.count(),
    result: await prisma.matchResult.count(),
  };

  const kick = await prisma.memberSportTemplate.findUnique({
    where: { id: "cmskickboxingtpl001" },
    include: { _count: { select: { fields: true } } },
  });
  if (!kick || kick.code !== "KICKBOXING" || kick._count.fields !== 7) {
    throw new Error("KICKBOXING template broken");
  }

  const legacyAssigned = await prisma.gym.count({
    where: { memberSportTemplateId: { not: null } },
  });
  const copied = await prisma.gymSportTemplateAssignment.count({
    where: { isActive: true },
  });
  // Every legacy FK should have a matching assignment
  const legacyGyms = await prisma.gym.findMany({
    where: { memberSportTemplateId: { not: null } },
    select: { id: true, memberSportTemplateId: true },
  });
  for (const g of legacyGyms) {
    const a = await prisma.gymSportTemplateAssignment.findUnique({
      where: {
        gymId_templateId: {
          gymId: g.id,
          templateId: g.memberSportTemplateId!,
        },
      },
    });
    if (!a?.isActive) {
      throw new Error(`missing assignment for gym ${g.id}`);
    }
  }

  let qa = await prisma.memberSportTemplate.findUnique({
    where: { code: QA_CODE },
  });
  if (!qa) {
    qa = await prisma.memberSportTemplate.create({
      data: {
        code: QA_CODE,
        name: "태권도 QA",
        sportType: "TAEKWONDO",
        active: true,
        version: 1,
        fields: {
          create: [
            {
              stableKey: "beltGrade",
              label: "급/단",
              type: "text",
              required: false,
              displayOrder: 0,
              active: true,
            },
          ],
        },
      },
    });
  }

  // Pick a gym with kickboxing assignment
  const gym =
    (await prisma.gym.findFirst({
      where: {
        sportTemplateAssignments: {
          some: { templateId: kick.id, isActive: true },
        },
      },
      select: { id: true, name: true },
    })) ??
    (await prisma.gym.findFirst({
      where: { memberSportTemplateId: kick.id },
      select: { id: true, name: true },
    }));
  if (!gym) throw new Error("no gym with kickboxing");

  await prisma.gymSportTemplateAssignment.upsert({
    where: {
      gymId_templateId: { gymId: gym.id, templateId: qa.id },
    },
    create: { gymId: gym.id, templateId: qa.id, isActive: true },
    update: { isActive: true },
  });

  const activeForGym = await prisma.gymSportTemplateAssignment.count({
    where: { gymId: gym.id, isActive: true },
  });
  if (activeForGym < 2) throw new Error("expected >=2 active templates");

  // Create QA member with 2 sports
  const member = await prisma.gymMember.create({
    data: {
      gymId: gym.id,
      memberNumber: `QA-MS-${Date.now()}`,
      name: "멀티종목 QA",
      phone: "01000009999",
      normalizedPhone: "01000009999",
    },
  });

  await prisma.gymMemberSportTemplateAssignment.createMany({
    data: [
      { gymMemberId: member.id, templateId: kick.id, isActive: true },
      { gymMemberId: member.id, templateId: qa.id, isActive: true },
    ],
  });

  const kickField = await prisma.memberSportTemplateField.findFirst({
    where: { templateId: kick.id, active: true },
  });
  const qaField = await prisma.memberSportTemplateField.findFirst({
    where: { templateId: qa.id, active: true },
  });
  if (!kickField || !qaField) throw new Error("missing fields");

  await prisma.gymMemberProfileValue.createMany({
    data: [
      {
        gymMemberId: member.id,
        sourceType: "SPORT",
        stableKey: kickField.stableKey,
        valueJson: "kick-val",
        sportTemplateFieldId: kickField.id,
      },
      {
        gymMemberId: member.id,
        sourceType: "SPORT",
        stableKey: qaField.stableKey,
        valueJson: "tkd-val",
        sportTemplateFieldId: qaField.id,
      },
    ],
  });

  // Partial update: change only kickboxing value
  await prisma.gymMemberProfileValue.updateMany({
    where: {
      gymMemberId: member.id,
      sportTemplateFieldId: kickField.id,
    },
    data: { valueJson: "kick-val-2" },
  });
  const tkdStill = await prisma.gymMemberProfileValue.findFirst({
    where: {
      gymMemberId: member.id,
      sportTemplateFieldId: qaField.id,
    },
  });
  if (JSON.stringify(tkdStill?.valueJson) !== JSON.stringify("tkd-val")) {
    throw new Error("TAEKWONDO value changed unexpectedly");
  }

  // Deactivate member sport — values must remain
  await prisma.gymMemberSportTemplateAssignment.update({
    where: {
      gymMemberId_templateId: {
        gymMemberId: member.id,
        templateId: qa.id,
      },
    },
    data: { isActive: false },
  });
  const valueCountAfterDeactivate = await prisma.gymMemberProfileValue.count({
    where: { gymMemberId: member.id, sportTemplateFieldId: qaField.id },
  });
  if (valueCountAfterDeactivate !== 1) {
    throw new Error("SPORT values deleted on deactivate");
  }

  // Reactivate
  await prisma.gymMemberSportTemplateAssignment.update({
    where: {
      gymMemberId_templateId: {
        gymMemberId: member.id,
        templateId: qa.id,
      },
    },
    data: { isActive: true },
  });

  // Gym deactivate template with values — soft only
  await prisma.gymSportTemplateAssignment.update({
    where: {
      gymId_templateId: { gymId: gym.id, templateId: qa.id },
    },
    data: { isActive: false },
  });
  const stillValues = await prisma.gymMemberProfileValue.count({
    where: { gymMemberId: member.id, sportTemplateFieldId: qaField.id },
  });
  if (stillValues !== 1) throw new Error("gym deactivate deleted values");

  // Cleanup QA member only (keep QA template for signup UI tests)
  await prisma.gymMemberProfileValue.deleteMany({
    where: { gymMemberId: member.id },
  });
  await prisma.gymMemberSportTemplateAssignment.deleteMany({
    where: { gymMemberId: member.id },
  });
  await prisma.gymMember.delete({ where: { id: member.id } });

  // Restore gym QA assignment active for future signup QA if desired
  await prisma.gymSportTemplateAssignment.update({
    where: {
      gymId_templateId: { gymId: gym.id, templateId: qa.id },
    },
    data: { isActive: true },
  });

  const after = {
    gymMember: await prisma.gymMember.count(),
    sport: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "SPORT" },
    }),
    gym: await prisma.gymMemberProfileValue.count({
      where: { sourceType: "GYM" },
    }),
    fighter: await prisma.fighter.count(),
    app: await prisma.eventApplication.count(),
    match: await prisma.bracketMatch.count(),
    result: await prisma.matchResult.count(),
  };

  console.log(
    JSON.stringify(
      {
        kickboxing: { id: kick.id, fields: kick._count.fields },
        legacyAssigned,
        assignmentActiveCount: copied,
        gymUsed: gym.name,
        deltas: {
          gymMember: after.gymMember - before.gymMember,
          sport: after.sport - before.sport,
          gymVals: after.gym - before.gym,
          fighter: after.fighter - before.fighter,
          eventApp: after.app - before.app,
          bracketMatch: after.match - before.match,
          matchResult: after.result - before.result,
        },
      },
      null,
      2,
    ),
  );

  for (const [k, v] of Object.entries({
    gymMember: after.gymMember - before.gymMember,
    sport: after.sport - before.sport,
    gymVals: after.gym - before.gym,
    fighter: after.fighter - before.fighter,
    eventApp: after.app - before.app,
    bracketMatch: after.match - before.match,
    matchResult: after.result - before.result,
  })) {
    if (v !== 0) throw new Error(`delta non-zero: ${k}=${v}`);
  }

  await prisma.$disconnect();
  await pool.end();
  console.log("QA PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
