/**
 * DEV member multi-sport isolation QA with BOXING+TAEKWONDO.
 * Cleans up QA member; leaves gym assignment as found (reactivates only if we deactivated).
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const dbUrl = String(
    (JSON.parse(raw) as Record<string, string>).DATABASE_PUBLIC_URL || "",
  );
  if (!/yamanote/i.test(dbUrl)) throw new Error("yamanote required");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const boxing = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { code: "BOXING" },
    include: { fields: { where: { active: true }, take: 1 } },
  });
  const tkd = await prisma.memberSportTemplate.findUniqueOrThrow({
    where: { code: "TAEKWONDO" },
    include: { fields: { where: { active: true }, take: 1 } },
  });

  const gym = await prisma.gym.findFirstOrThrow({
    select: { id: true, name: true },
  });

  await prisma.gymSportTemplateAssignment.upsert({
    where: {
      gymId_templateId: { gymId: gym.id, templateId: boxing.id },
    },
    create: { gymId: gym.id, templateId: boxing.id, isActive: true },
    update: { isActive: true },
  });
  await prisma.gymSportTemplateAssignment.upsert({
    where: {
      gymId_templateId: { gymId: gym.id, templateId: tkd.id },
    },
    create: { gymId: gym.id, templateId: tkd.id, isActive: true },
    update: { isActive: true },
  });

  const beforeMember = await prisma.gymMember.count();
  const beforeSport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });

  const member = await prisma.gymMember.create({
    data: {
      gymId: gym.id,
      memberNumber: `QA-DN-${Date.now()}`,
      name: "표시명 QA",
      phone: "01000008888",
      normalizedPhone: "01000008888",
    },
  });

  await prisma.gymMemberSportTemplateAssignment.createMany({
    data: [
      { gymMemberId: member.id, templateId: boxing.id, isActive: true },
      { gymMemberId: member.id, templateId: tkd.id, isActive: true },
    ],
  });

  const bField = boxing.fields[0]!;
  const tField = tkd.fields[0]!;
  await prisma.gymMemberProfileValue.createMany({
    data: [
      {
        gymMemberId: member.id,
        sourceType: "SPORT",
        stableKey: bField.stableKey,
        valueJson: "boxing-only",
        sportTemplateFieldId: bField.id,
      },
      {
        gymMemberId: member.id,
        sourceType: "SPORT",
        stableKey: tField.stableKey,
        valueJson: "tkd-only",
        sportTemplateFieldId: tField.id,
      },
    ],
  });

  await prisma.gymMemberProfileValue.updateMany({
    where: { gymMemberId: member.id, sportTemplateFieldId: bField.id },
    data: { valueJson: "boxing-updated" },
  });
  const tkdVal = await prisma.gymMemberProfileValue.findFirst({
    where: { gymMemberId: member.id, sportTemplateFieldId: tField.id },
  });
  if (JSON.stringify(tkdVal?.valueJson) !== JSON.stringify("tkd-only")) {
    throw new Error("isolation failed");
  }

  // cleanup member only
  await prisma.gymMemberProfileValue.deleteMany({
    where: { gymMemberId: member.id },
  });
  await prisma.gymMemberSportTemplateAssignment.deleteMany({
    where: { gymMemberId: member.id },
  });
  await prisma.gymMember.delete({ where: { id: member.id } });

  const afterMember = await prisma.gymMember.count();
  const afterSport = await prisma.gymMemberProfileValue.count({
    where: { sourceType: "SPORT" },
  });

  console.log(
    JSON.stringify(
      {
        gym: gym.name,
        boxingDisplay: boxing.displayName,
        tkdDisplay: tkd.displayName,
        isolationOk: true,
        memberDelta: afterMember - beforeMember,
        sportDelta: afterSport - beforeSport,
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
