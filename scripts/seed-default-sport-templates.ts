/**
 * Idempotent default MemberSportTemplate seed (definition only).
 * - Does NOT assign templates to Gyms
 * - Does NOT rewrite existing fields on already-seeded templates
 * - KICKBOXING: metadata normalize only when still default seed names
 *
 *   npx tsx scripts/seed-default-sport-templates.ts
 */
import { PrismaClient, GymMemberDynamicFieldType } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { KICKBOXING_TEMPLATE_ID } from "../src/lib/gym-member-profile/types";

type FieldSeed = {
  stableKey: string;
  label: string;
  type: GymMemberDynamicFieldType;
  options?: string[];
  placeholder?: string;
  helpText?: string;
};

type TemplateSeed = {
  id: string;
  code: string;
  name: string;
  displayName: string;
  sportType: string;
  fields: FieldSeed[];
};

const SHARED_MEMBER_TYPE: FieldSeed = {
  stableKey: "memberType",
  label: "회원 유형",
  type: "select",
  options: ["일반", "선수"],
};

const SHARED_WEIGHT: FieldSeed = {
  stableKey: "weightClass",
  label: "체급",
  type: "text",
  placeholder: "예: -57kg",
};

const SHARED_EXP: FieldSeed = {
  stableKey: "trainingExperience",
  label: "운동 경력",
  type: "text",
  placeholder: "예: 3년",
};

const SHARED_STANCE: FieldSeed = {
  stableKey: "stance",
  label: "스탠스",
  type: "select",
  options: ["오소독스", "사우스포", "스위치"],
};

const SHARED_SPARRING: FieldSeed = {
  stableKey: "sparringAvailable",
  label: "스파링 가능 여부",
  type: "boolean",
};

const SHARED_COMP: FieldSeed = {
  stableKey: "competitionParticipation",
  label: "대회 출전 여부",
  type: "boolean",
};

const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    id: "cmsboxingtpl001",
    code: "BOXING",
    name: "복싱 기본 회원정보",
    displayName: "복싱",
    sportType: "BOXING",
    fields: [
      SHARED_MEMBER_TYPE,
      SHARED_WEIGHT,
      SHARED_EXP,
      SHARED_STANCE,
      SHARED_SPARRING,
      SHARED_COMP,
    ],
  },
  {
    id: "cmstaekwondotpl001",
    code: "TAEKWONDO",
    name: "태권도 기본 회원정보",
    displayName: "태권도",
    sportType: "TAEKWONDO",
    fields: [
      SHARED_MEMBER_TYPE,
      {
        stableKey: "rankLevel",
        label: "현재 급/품/단",
        type: "text",
        placeholder: "예: 1품, 2단",
      },
      SHARED_EXP,
      {
        stableKey: "sparringParticipation",
        label: "겨루기 여부",
        type: "boolean",
      },
      SHARED_COMP,
    ],
  },
  {
    id: "cmsmmatpl001",
    code: "MMA",
    name: "MMA 기본 회원정보",
    displayName: "MMA",
    sportType: "MMA",
    fields: [
      SHARED_MEMBER_TYPE,
      SHARED_WEIGHT,
      SHARED_EXP,
      {
        stableKey: "primaryDiscipline",
        label: "주종목",
        type: "select",
        options: ["타격", "레슬링", "주짓수", "종합"],
      },
      SHARED_SPARRING,
      SHARED_COMP,
    ],
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!dbUrl) throw new Error("DATABASE_URL required");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: /railway|rlwy|amazonaws/i.test(dbUrl)
      ? { rejectUnauthorized: false }
      : undefined,
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
  };

  // KICKBOXING metadata only — never recreate fields
  const kick = await prisma.memberSportTemplate.findUnique({
    where: { id: KICKBOXING_TEMPLATE_ID },
    include: { _count: { select: { fields: true } } },
  });
  if (kick) {
    const patch: {
      name?: string;
      displayName?: string;
    } = {};
    if (kick.name.trim() === "킥복싱") {
      patch.name = "킥복싱 기본 회원정보";
    }
    if (
      !kick.displayName?.trim() ||
      kick.displayName.trim().toLowerCase() === "kickboxing" ||
      kick.displayName.trim() === kick.name.trim()
    ) {
      // Prefer Korean display; if displayName was backfilled from name "킥복싱" keep 킥복싱
      patch.displayName = "킥복싱";
    }
    if (Object.keys(patch).length > 0) {
      await prisma.memberSportTemplate.update({
        where: { id: kick.id },
        data: patch,
      });
    }
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await prisma.memberSportTemplate.findFirst({
      where: { OR: [{ id: tpl.id }, { code: tpl.code }] },
      include: { _count: { select: { fields: true } } },
    });
    if (existing) {
      skipped.push(
        `${existing.code} (id=${existing.id}, fields=${existing._count.fields})`,
      );
      continue;
    }

    await prisma.memberSportTemplate.create({
      data: {
        id: tpl.id,
        code: tpl.code,
        name: tpl.name,
        displayName: tpl.displayName,
        sportType: tpl.sportType,
        active: true,
        version: 1,
        fields: {
          create: tpl.fields.map((f, i) => ({
            stableKey: f.stableKey,
            label: f.label,
            type: f.type,
            required: false,
            placeholder: f.placeholder ?? null,
            helpText: f.helpText ?? null,
            optionsJson: f.options ? f.options : undefined,
            displayOrder: i + 1,
            active: true,
          })),
        },
      },
    });
    created.push(tpl.code);
  }

  const templates = await prisma.memberSportTemplate.findMany({
    where: {
      code: { in: ["KICKBOXING", "BOXING", "TAEKWONDO", "MMA"] },
    },
    include: { _count: { select: { fields: true } } },
    orderBy: { code: "asc" },
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
  };

  console.log(
    JSON.stringify(
      {
        created,
        skipped,
        templates: templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          displayName: t.displayName,
          fields: t._count.fields,
          active: t.active,
        })),
        deltas: {
          gymMember: after.gymMember - before.gymMember,
          sport: after.sport - before.sport,
          gym: after.gym - before.gym,
          assignment: after.assignment - before.assignment,
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
