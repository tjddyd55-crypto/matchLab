/**
 * 대진표 자동 매칭 테스트용 데모 데이터 (idempotent upsert).
 * - gym + gym1~gym7 체육관 계정
 * - 8개 체육관 × 10명 선수 (80명), 체급/종목/성별 분산
 * - 테스트 대회 approved EventApplication + Payment (크레딧 ledger 미발생)
 *
 * 금지: db:seed, truncate, hard delete, approveEventApplication 경유
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import {
  ApplicationStatus,
  FighterStatus,
  GymStatus,
  PaymentStatus,
  UserRole,
} from "../src/generated/prisma";
import { toUtcDateOnly } from "../src/lib/date-only";
import { prisma } from "../src/lib/prisma";
import { repairGymFighterAffiliations } from "./lib/repair-gym-affiliation";

const DEMO_PASSWORD_FALLBACK = "123456!!";
const DEMO_FIGHTER_CODE_PREFIX = "FTR-BKT-";

const GYM_ACCOUNTS = [
  { loginId: "gym1", email: "gym1@demo.local", name: "데모 체육관 1" },
  { loginId: "gym2", email: "gym2@demo.local", name: "데모 체육관 2" },
  { loginId: "gym3", email: "gym3@demo.local", name: "데모 체육관 3" },
  { loginId: "gym4", email: "gym4@demo.local", name: "데모 체육관 4" },
  { loginId: "gym5", email: "gym5@demo.local", name: "데모 체육관 5" },
  { loginId: "gym6", email: "gym6@demo.local", name: "데모 체육관 6" },
  { loginId: "gym7", email: "gym7@demo.local", name: "데모 체육관 7" },
] as const;

const ALL_GYM_LOGINS = ["gym", ...GYM_ACCOUNTS.map((g) => g.loginId)] as const;

type DivisionPlan = {
  key: string;
  sportType: string;
  gender: string;
  ageGroup: string;
  weightClass: string;
  skillLevel: string;
  targetCount: number;
};

/** 80명 = 12개 division, 짝수/홀수 혼합(4·5·6·7·9명 케이스), 3종목 분산 */
const DIVISION_PLAN: DivisionPlan[] = [
  {
    key: "KB-M-U12-30",
    sportType: "kickboxing",
    gender: "male",
    ageGroup: "U12",
    weightClass: "-30kg",
    skillLevel: "beginner",
    targetCount: 6,
  },
  {
    key: "BX-M-U12-35",
    sportType: "boxing",
    gender: "male",
    ageGroup: "U12",
    weightClass: "-35kg",
    skillLevel: "beginner",
    targetCount: 4,
  },
  {
    key: "MT-M-U14-45",
    sportType: "muaythai",
    gender: "male",
    ageGroup: "U14",
    weightClass: "-45kg",
    skillLevel: "beginner",
    targetCount: 7,
  },
  {
    key: "KB-M-U14-50",
    sportType: "kickboxing",
    gender: "male",
    ageGroup: "U14",
    weightClass: "-50kg",
    skillLevel: "beginner",
    targetCount: 6,
  },
  {
    key: "BX-M-U16-60",
    sportType: "boxing",
    gender: "male",
    ageGroup: "U16",
    weightClass: "-60kg",
    skillLevel: "intermediate",
    targetCount: 9,
  },
  {
    key: "MT-M-U16-65",
    sportType: "muaythai",
    gender: "male",
    ageGroup: "U16",
    weightClass: "-65kg",
    skillLevel: "intermediate",
    targetCount: 8,
  },
  {
    key: "KB-M-OPEN-70",
    sportType: "kickboxing",
    gender: "male",
    ageGroup: "open",
    weightClass: "-70kg",
    skillLevel: "open",
    targetCount: 9,
  },
  {
    key: "BX-M-OPEN-75",
    sportType: "boxing",
    gender: "male",
    ageGroup: "open",
    weightClass: "-75kg",
    skillLevel: "open",
    targetCount: 7,
  },
  {
    key: "KB-F-U12-30",
    sportType: "kickboxing",
    gender: "female",
    ageGroup: "U12",
    weightClass: "-30kg",
    skillLevel: "beginner",
    targetCount: 6,
  },
  {
    key: "BX-F-U14-45",
    sportType: "boxing",
    gender: "female",
    ageGroup: "U14",
    weightClass: "-45kg",
    skillLevel: "beginner",
    targetCount: 5,
  },
  {
    key: "MT-F-U16-55",
    sportType: "muaythai",
    gender: "female",
    ageGroup: "U16",
    weightClass: "-55kg",
    skillLevel: "intermediate",
    targetCount: 7,
  },
  {
    key: "KB-F-OPEN-60",
    sportType: "kickboxing",
    gender: "female",
    ageGroup: "open",
    weightClass: "-60kg",
    skillLevel: "open",
    targetCount: 6,
  },
];

const TOTAL_PLANNED_FIGHTERS = DIVISION_PLAN.reduce(
  (sum, d) => sum + d.targetCount,
  0,
);

function gymTag(gymLoginId: string): string {
  return gymLoginId === "gym" ? "GYM" : gymLoginId.toUpperCase();
}

function fighterDisplayName(gymLoginId: string, seq: number): string {
  const num = String(seq).padStart(2, "0");
  return `${gymTag(gymLoginId)} 선수 ${num}`;
}

function fighterCodeFor(gymLoginId: string, seq: number): string {
  return `${DEMO_FIGHTER_CODE_PREFIX}${gymTag(gymLoginId)}-${String(seq).padStart(2, "0")}`;
}

function fighterPoolKey(gymLoginId: string, seq: number): string {
  return `${gymLoginId}:${seq}`;
}

function formatRecord(win: number, loss: number, draw: number): string {
  return `${win}승 ${loss}패 ${draw}무`;
}

function birthYearForAgeGroup(ageGroup: string): number {
  const baseYear = 2026;
  switch (ageGroup) {
    case "U12":
      return baseYear - 11;
    case "U14":
      return baseYear - 13;
    case "U16":
      return baseYear - 15;
    case "open":
      return baseYear - 22;
    default:
      return baseYear - 14;
  }
}

function parseWeightKg(weightClass: string): number {
  const matched = weightClass.match(/(\d+)/);
  return matched ? Number(matched[1]) : 60;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string } | null> {
  const target = normalizeEmail(email);
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => normalizeEmail(u.email ?? "") === target,
    );
    if (found) return { id: found.id };
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureAuthUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
): Promise<{ created: boolean }> {
  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    return { created: false };
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizeEmail(email),
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Auth 생성 실패 (${email}): ${error.message}`);
  if (!data.user?.id) throw new Error(`Auth id 없음: ${email}`);
  return { created: true };
}

async function ensureActiveGymHistory(
  fighterId: string,
  gymId: string,
): Promise<boolean> {
  const existing = await prisma.fighterGymHistory.findFirst({
    where: { fighterId, gymId, status: "active", endDate: null },
    select: { id: true },
  });
  if (existing) return false;
  await prisma.fighterGymHistory.create({
    data: { fighterId, gymId, status: "active" },
  });
  return true;
}

async function resolveTargetEvent(): Promise<{
  id: string;
  title: string;
  publicSlug: string | null;
}> {
  const envId = process.env.DEMO_BRACKET_EVENT_ID?.trim();
  const envSlug = process.env.DEMO_BRACKET_EVENT_SLUG?.trim();

  if (envId) {
    const byId = await prisma.event.findUnique({
      where: { id: envId },
      select: { id: true, title: true, publicSlug: true },
    });
    if (byId) return byId;
    throw new Error(
      `DEMO_BRACKET_EVENT_ID로 지정한 대회를 찾을 수 없습니다: ${envId}`,
    );
  }

  const slug = envSlug || "sample-open-2026";
  const bySlug = await prisma.event.findFirst({
    where: { publicSlug: slug },
    select: { id: true, title: true, publicSlug: true },
  });
  if (!bySlug) {
    throw new Error(
      `테스트 대회를 찾을 수 없습니다 (slug=${slug}). DEMO_BRACKET_EVENT_ID / DEMO_BRACKET_EVENT_SLUG / sample-open-2026 확인.`,
    );
  }
  return bySlug;
}

async function findOrCreateDivision(
  eventId: string,
  plan: DivisionPlan,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.eventDivision.findFirst({
    where: {
      eventId,
      sportType: plan.sportType,
      ruleType: "amateur",
      gender: plan.gender,
      ageGroup: plan.ageGroup,
      weightClass: plan.weightClass,
      skillLevel: plan.skillLevel,
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.eventDivision.create({
    data: {
      eventId,
      sportType: plan.sportType,
      ruleType: "amateur",
      gender: plan.gender,
      ageGroup: plan.ageGroup,
      weightClass: plan.weightClass,
      skillLevel: plan.skillLevel,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

type FighterAssignment = {
  gymLoginId: string;
  seq: number;
  divisionKey: string;
};

/**
 * division마다 체육관을 라운드로빈으로 배정해 같은 division에 여러 체육관 선수가 섞이게 한다.
 */
function buildFighterAssignments(): FighterAssignment[] {
  if (TOTAL_PLANNED_FIGHTERS !== 80) {
    throw new Error(
      `DIVISION_PLAN 합계가 80이 아닙니다: ${TOTAL_PLANNED_FIGHTERS}`,
    );
  }

  const nextSeqByGym = new Map<string, number>();
  for (const gymLoginId of ALL_GYM_LOGINS) {
    nextSeqByGym.set(gymLoginId, 1);
  }

  const assignments: FighterAssignment[] = [];
  let gymCursor = 0;

  for (const div of DIVISION_PLAN) {
    for (let i = 0; i < div.targetCount; i++) {
      let placed = false;
      for (let attempt = 0; attempt < ALL_GYM_LOGINS.length; attempt++) {
        const gymLoginId =
          ALL_GYM_LOGINS[(gymCursor + attempt) % ALL_GYM_LOGINS.length]!;
        const seq = nextSeqByGym.get(gymLoginId)!;
        if (seq > 10) continue;

        assignments.push({ gymLoginId, seq, divisionKey: div.key });
        nextSeqByGym.set(gymLoginId, seq + 1);
        gymCursor = (gymCursor + attempt + 1) % ALL_GYM_LOGINS.length;
        placed = true;
        break;
      }
      if (!placed) {
        throw new Error(
          `division ${div.key} 배정 실패 — 사용 가능한 선수 슬롯이 부족합니다.`,
        );
      }
    }
  }

  return assignments;
}

function buildAssignmentProfileMap(
  assignments: FighterAssignment[],
): Map<string, DivisionPlan> {
  const planByKey = new Map(DIVISION_PLAN.map((p) => [p.key, p]));
  const map = new Map<string, DivisionPlan>();
  for (const a of assignments) {
    const plan = planByKey.get(a.divisionKey);
    if (!plan) continue;
    map.set(fighterPoolKey(a.gymLoginId, a.seq), plan);
  }
  return map;
}

async function ensureDemoApplicationPayment(
  applicationId: string,
  eventId: string,
  fighterName: string,
  gymName: string,
): Promise<"created" | "repaired" | "skipped"> {
  const paymentSetting = await prisma.eventPaymentSetting.findUnique({
    where: { eventId },
    select: { feeAmount: true },
  });
  const amount = paymentSetting?.feeAmount ?? 80000;
  const depositorName = `${fighterName} (${gymName})`.slice(0, 120);

  const existing = await prisma.eventApplicationPayment.findFirst({
    where: { eventApplicationId: applicationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) {
    await prisma.eventApplicationPayment.update({
      where: { id: existing.id },
      data: {
        paymentStatus: PaymentStatus.paid,
        depositorName,
        amount,
      },
    });
    return "repaired";
  }

  await prisma.eventApplicationPayment.create({
    data: {
      eventApplicationId: applicationId,
      amount,
      paymentMethod: "bank_transfer",
      paymentStatus: PaymentStatus.paid,
      depositorName,
    },
  });
  return "created";
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL이 설정되지 않았습니다.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const password = process.env.DEMO_PASSWORD?.trim() || DEMO_PASSWORD_FALLBACK;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const event = await resolveTargetEvent();
  console.info("[setup-bracket-demo-data] target event:", {
    id: event.id,
    title: event.title,
    slug: event.publicSlug,
  });

  const divisionIdByKey = new Map<string, string>();
  let divisionsCreated = 0;
  let divisionsReused = 0;

  for (const plan of DIVISION_PLAN) {
    const { id, created } = await findOrCreateDivision(event.id, plan);
    divisionIdByKey.set(plan.key, id);
    if (created) divisionsCreated += 1;
    else divisionsReused += 1;
  }

  let gymsCreated = 0;
  let gymsRepaired = 0;
  const gymIdByLogin = new Map<string, string>();

  const baseGymUser = await prisma.user.findFirst({
    where: { loginId: "gym" },
    include: { ownedGym: true },
  });
  if (!baseGymUser?.ownedGym) {
    throw new Error(
      "기존 gym 계정이 없습니다. 먼저 npm run setup:demo-users를 실행하세요.",
    );
  }
  gymIdByLogin.set("gym", baseGymUser.ownedGym.id);
  gymsRepaired += 1;

  for (const row of GYM_ACCOUNTS) {
    const auth = await ensureAuthUser(supabase, row.email, password);
    if (auth.created) gymsCreated += 1;
    else gymsRepaired += 1;

    const authUser = await findAuthUserByEmail(supabase, row.email);
    if (!authUser) throw new Error(`Auth 사용자 없음: ${row.email}`);

    const user = await prisma.user.upsert({
      where: { loginId: row.loginId },
      create: {
        email: row.email,
        loginId: row.loginId,
        authUserId: authUser.id,
        name: row.name,
        role: UserRole.gym,
      },
      update: {
        email: row.email,
        authUserId: authUser.id,
        name: row.name,
        role: UserRole.gym,
      },
    });

    const gym = await prisma.gym.upsert({
      where: { ownerUserId: user.id },
      create: {
        ownerUserId: user.id,
        name: row.name,
        phone: `0109000${row.loginId.replace("gym", "")}`,
        address: "데모 주소",
        status: GymStatus.active,
      },
      update: {
        name: row.name,
        status: GymStatus.active,
      },
    });
    gymIdByLogin.set(row.loginId, gym.id);
  }

  const assignments = buildFighterAssignments();
  const profileByFighter = buildAssignmentProfileMap(assignments);

  let fightersCreated = 0;
  let fightersRepaired = 0;
  let historiesLinked = 0;
  const fighterIdByCode = new Map<string, string>();
  const fightersPerGym = new Map<string, number>();

  for (const gymLoginId of ALL_GYM_LOGINS) {
    const gymId = gymIdByLogin.get(gymLoginId);
    if (!gymId) continue;

    let gymFighterCount = 0;

    for (let seq = 1; seq <= 10; seq++) {
      const code = fighterCodeFor(gymLoginId, seq);
      const name = fighterDisplayName(gymLoginId, seq);
      const profile = profileByFighter.get(fighterPoolKey(gymLoginId, seq));

      const gender = profile?.gender ?? (seq % 2 === 0 ? "female" : "male");
      const birthYear = birthYearForAgeGroup(profile?.ageGroup ?? "U14");
      const weight = profile
        ? parseWeightKg(profile.weightClass)
        : 50 + (seq % 5) * 5;
      const primarySport = profile?.sportType ?? "kickboxing";

      const existing = await prisma.fighter.findUnique({
        where: { fighterCode: code },
        select: { id: true, currentGymId: true },
      });

      const fighter = await prisma.fighter.upsert({
        where: { fighterCode: code },
        create: {
          fighterCode: code,
          userId: null,
          currentGymId: gymId,
          name,
          birthDate: toUtcDateOnly(new Date(`${birthYear}-06-15`)),
          gender,
          phone: null,
          weight,
          primarySport,
          status: FighterStatus.active,
          recordWin: 0,
          recordLoss: 0,
          recordDraw: 0,
        },
        update: {
          currentGymId: gymId,
          name,
          birthDate: toUtcDateOnly(new Date(`${birthYear}-06-15`)),
          gender,
          weight,
          primarySport,
          status: FighterStatus.active,
          recordWin: 0,
          recordLoss: 0,
          recordDraw: 0,
        },
      });

      fighterIdByCode.set(code, fighter.id);
      gymFighterCount += 1;

      if (existing) fightersRepaired += 1;
      else fightersCreated += 1;

      if (await ensureActiveGymHistory(fighter.id, gymId)) {
        historiesLinked += 1;
      }
    }

    fightersPerGym.set(gymLoginId, gymFighterCount);

    const repaired = await repairGymFighterAffiliations(gymId);
    if (repaired > 0) {
      console.info(
        `[setup-bracket-demo-data] ${gymLoginId} currentGymId 동기화: ${repaired}명`,
      );
    }
  }

  let applicationsCreated = 0;
  let applicationsRepaired = 0;
  let paymentsCreated = 0;
  let paymentsRepaired = 0;

  for (const a of assignments) {
    const code = fighterCodeFor(a.gymLoginId, a.seq);
    const fighterId = fighterIdByCode.get(code);
    const gymId = gymIdByLogin.get(a.gymLoginId);
    const divisionId = divisionIdByKey.get(a.divisionKey);
    if (!fighterId || !gymId || !divisionId) continue;

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true },
    });
    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        profileImageUrl: true,
      },
    });
    if (!gym || !fighter) continue;

    const fighterSnapshot = {
      fighterId: fighter.id,
      fighterCode: fighter.fighterCode,
      name: fighter.name,
      gymName: gym.name,
      profileImageUrl: fighter.profileImageUrl,
      recordSummary: formatRecord(
        fighter.recordWin,
        fighter.recordLoss,
        fighter.recordDraw,
      ),
    };
    const gymSnapshot = { gymId, name: gym.name };

    const existing = await prisma.eventApplication.findUnique({
      where: {
        eventId_fighterId_divisionId: {
          eventId: event.id,
          fighterId,
          divisionId,
        },
      },
      select: { id: true },
    });

    let applicationId: string;
    if (existing) {
      await prisma.eventApplication.update({
        where: { id: existing.id },
        data: {
          gymId,
          status: ApplicationStatus.approved,
          paymentStatus: PaymentStatus.paid,
          fighterSnapshot,
          gymSnapshot,
          creditChargedAt: null,
          creditChargeLedgerId: null,
          creditChargeAmount: 0,
        },
      });
      applicationId = existing.id;
      applicationsRepaired += 1;
    } else {
      const created = await prisma.eventApplication.create({
        data: {
          eventId: event.id,
          divisionId,
          gymId,
          fighterId,
          status: ApplicationStatus.approved,
          paymentStatus: PaymentStatus.paid,
          fighterSnapshot,
          gymSnapshot,
          appliedAt: new Date(),
          creditChargeAmount: 0,
        },
        select: { id: true },
      });
      applicationId = created.id;
      applicationsCreated += 1;
    }

    const paymentResult = await ensureDemoApplicationPayment(
      applicationId,
      event.id,
      fighter.name,
      gym.name,
    );
    if (paymentResult === "created") paymentsCreated += 1;
    else if (paymentResult === "repaired") paymentsRepaired += 1;
  }

  const divisionCounts = new Map<string, number>();
  for (const a of assignments) {
    divisionCounts.set(
      a.divisionKey,
      (divisionCounts.get(a.divisionKey) ?? 0) + 1,
    );
  }

  let expectedAutoPairs = 0;
  let expectedUnmatched = 0;
  for (const count of divisionCounts.values()) {
    expectedAutoPairs += Math.floor(count / 2);
    expectedUnmatched += count % 2;
  }

  console.info("");
  console.info("========== setup-bracket-demo-data 요약 ==========");
  console.info(
    `target event: ${event.publicSlug ?? "(no slug)"} / ${event.id}`,
  );
  console.info(`gyms created/repaired: ${gymsCreated} / ${gymsRepaired}`);
  console.info(
    `fighters created/repaired: ${fightersCreated} / ${fightersRepaired} (total demo: ${fightersCreated + fightersRepaired})`,
  );
  console.info(`active gym histories linked: ${historiesLinked}`);
  console.info(
    `approved applications created/repaired: ${applicationsCreated} / ${applicationsRepaired}`,
  );
  console.info(
    `payments created/repaired: ${paymentsCreated} / ${paymentsRepaired}`,
  );
  console.info(
    `divisions used: ${DIVISION_PLAN.length} (created ${divisionsCreated}, reused ${divisionsReused})`,
  );
  console.info(`expected auto pairs: ${expectedAutoPairs}`);
  console.info(`expected unmatched candidates: ${expectedUnmatched}`);
  console.info(
    `idempotent repairs (no duplicate create): fighters ${fightersRepaired}, applications ${applicationsRepaired}`,
  );
  console.info("");
  console.info("체육관별 선수 수:");
  for (const gymLoginId of ALL_GYM_LOGINS) {
    console.info(`  ${gymLoginId}: ${fightersPerGym.get(gymLoginId) ?? 0}명`);
  }
  console.info("");
  console.info("division별 승인 신청자 수:");
  for (const plan of DIVISION_PLAN) {
    console.info(
      `  ${plan.key} (${plan.sportType} ${plan.gender} ${plan.ageGroup} ${plan.weightClass}): ${divisionCounts.get(plan.key) ?? 0}명`,
    );
  }
  console.info("");
  console.info("※ 크레딧 ledger 미발생 — EventApplication 직접 upsert");
  console.info("※ db:seed / truncate / hard delete 없음");
  console.info("※ fighterCode prefix:", DEMO_FIGHTER_CODE_PREFIX);
  console.info("==================================================");
}

main()
  .catch((e) => {
    console.error("[setup-bracket-demo-data] 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
