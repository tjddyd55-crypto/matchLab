/**
 * 대진표 자동 매칭 테스트용 데모 데이터 (idempotent upsert).
 * - gym1~gym7 체육관 계정
 * - 8개 체육관 × 10명 선수 (80명)
 * - 테스트 대회 approved EventApplication (크레딧 ledger 미발생)
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
  gender: string;
  ageGroup: string;
  weightClass: string;
  skillLevel: string;
  targetCount: number;
};

const DIVISION_PLAN: DivisionPlan[] = [
  { key: "M-U12-30", gender: "male", ageGroup: "U12", weightClass: "-30kg", skillLevel: "beginner", targetCount: 5 },
  { key: "M-U12-35", gender: "male", ageGroup: "U12", weightClass: "-35kg", skillLevel: "beginner", targetCount: 4 },
  { key: "M-U14-45", gender: "male", ageGroup: "U14", weightClass: "-45kg", skillLevel: "beginner", targetCount: 6 },
  { key: "M-U14-50", gender: "male", ageGroup: "U14", weightClass: "-50kg", skillLevel: "beginner", targetCount: 5 },
  { key: "M-U16-60", gender: "male", ageGroup: "U16", weightClass: "-60kg", skillLevel: "intermediate", targetCount: 8 },
  { key: "M-U16-65", gender: "male", ageGroup: "U16", weightClass: "-65kg", skillLevel: "intermediate", targetCount: 7 },
  { key: "F-U12-30", gender: "female", ageGroup: "U12", weightClass: "-30kg", skillLevel: "beginner", targetCount: 5 },
  { key: "F-U14-45", gender: "female", ageGroup: "U14", weightClass: "-45kg", skillLevel: "beginner", targetCount: 4 },
  { key: "M-OPEN-70", gender: "male", ageGroup: "open", weightClass: "-70kg", skillLevel: "open", targetCount: 8 },
  { key: "M-OPEN-75", gender: "male", ageGroup: "open", weightClass: "-75kg", skillLevel: "open", targetCount: 6 },
];

function fighterDisplayName(gymLoginId: string, seq: number): string {
  const num = String(seq).padStart(2, "0");
  if (gymLoginId === "gym") return `GYM 홍길동 ${num}`;
  const tag = gymLoginId.toUpperCase();
  return `${tag} 선수 ${num}`;
}

function fighterCodeFor(gymLoginId: string, seq: number): string {
  const tag = gymLoginId === "gym" ? "GYM" : gymLoginId.toUpperCase();
  return `FTR-BKT-${tag}-${String(seq).padStart(2, "0")}`;
}

function dummyPhone(gymLoginId: string, seq: number): string {
  const gymNum = gymLoginId === "gym" ? "00" : gymLoginId.replace("gym", "").padStart(2, "0");
  return `0109${gymNum}${String(seq).padStart(3, "0")}`;
}

function formatRecord(win: number, loss: number, draw: number): string {
  return `${win}승 ${loss}패 ${draw}무`;
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

async function resolveTargetEvent(): Promise<{ id: string; title: string; publicSlug: string | null }> {
  const envId = process.env.DEMO_BRACKET_EVENT_ID?.trim();
  const envSlug =
    process.env.DEMO_BRACKET_EVENT_SLUG?.trim() || "sample-open-2026";

  if (envId) {
    const byId = await prisma.event.findUnique({
      where: { id: envId },
      select: { id: true, title: true, publicSlug: true },
    });
    if (byId) return byId;
  }

  const bySlug = await prisma.event.findFirst({
    where: { publicSlug: envSlug },
    select: { id: true, title: true, publicSlug: true },
  });
  if (!bySlug) {
    throw new Error(
      `테스트 대회를 찾을 수 없습니다 (slug=${envSlug}). sample-open-2026 또는 DEMO_BRACKET_EVENT_* 확인.`,
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
      sportType: "kickboxing",
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
      sportType: "kickboxing",
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

function buildFighterAssignments(): FighterAssignment[] {
  const pool: { gymLoginId: string; seq: number }[] = [];
  for (const gymLoginId of ALL_GYM_LOGINS) {
    for (let seq = 1; seq <= 10; seq++) {
      pool.push({ gymLoginId, seq });
    }
  }

  const assignments: FighterAssignment[] = [];
  let poolIdx = 0;

  for (const div of DIVISION_PLAN) {
    for (let i = 0; i < div.targetCount; i++) {
      assignments.push({ ...pool[poolIdx]!, divisionKey: div.key });
      poolIdx += 1;
    }
  }

  while (poolIdx < pool.length) {
    const div = DIVISION_PLAN[(poolIdx - 58) % DIVISION_PLAN.length]!;
    assignments.push({ ...pool[poolIdx]!, divisionKey: div.key });
    poolIdx += 1;
  }

  return assignments;
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
  console.info("[setup-bracket-demo-data] 대상 대회:", {
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
      '기존 gym 계정이 없습니다. 먼저 npm run setup:demo-users를 실행하세요.',
    );
  }
  gymIdByLogin.set("gym", baseGymUser.ownedGym.id);

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

  let fightersCreated = 0;
  let fightersUpdated = 0;
  let historiesLinked = 0;

  const assignments = buildFighterAssignments();
  const fighterIdByCode = new Map<string, string>();

  for (const gymLoginId of ALL_GYM_LOGINS) {
    const gymId = gymIdByLogin.get(gymLoginId);
    if (!gymId) continue;

    for (let seq = 1; seq <= 10; seq++) {
      const code = fighterCodeFor(gymLoginId, seq);
      const name = fighterDisplayName(gymLoginId, seq);
      const gender = seq % 3 === 0 ? "female" : "male";
      const birthYear = gymLoginId === "gym" ? 2012 : 2011 + (seq % 6);

      const existing = await prisma.fighter.findUnique({
        where: { fighterCode: code },
        select: { id: true },
      });

      const fighter = await prisma.fighter.upsert({
        where: { fighterCode: code },
        create: {
          fighterCode: code,
          currentGymId: gymId,
          name,
          birthDate: toUtcDateOnly(new Date(`${birthYear}-06-15`)),
          gender,
          phone: dummyPhone(gymLoginId, seq),
          status: FighterStatus.active,
          recordWin: 0,
          recordLoss: 0,
          recordDraw: 0,
        },
        update: {
          currentGymId: gymId,
          name,
          gender,
          phone: dummyPhone(gymLoginId, seq),
          status: FighterStatus.active,
          recordWin: 0,
          recordLoss: 0,
          recordDraw: 0,
        },
      });

      fighterIdByCode.set(code, fighter.id);
      if (existing) fightersUpdated += 1;
      else fightersCreated += 1;

      if (await ensureActiveGymHistory(fighter.id, gymId)) {
        historiesLinked += 1;
      }
    }

    const repaired = await repairGymFighterAffiliations(gymId);
    if (repaired > 0) {
      console.info(
        `[setup-bracket-demo-data] ${gymLoginId} currentGymId 동기화: ${repaired}명`,
      );
    }
  }

  let applicationsCreated = 0;
  let applicationsUpdated = 0;

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

    if (existing) {
      await prisma.eventApplication.update({
        where: { id: existing.id },
        data: {
          gymId,
          status: ApplicationStatus.approved,
          paymentStatus: PaymentStatus.paid,
          fighterSnapshot,
          gymSnapshot,
        },
      });
      applicationsUpdated += 1;
    } else {
      await prisma.eventApplication.create({
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
        },
      });
      applicationsCreated += 1;
    }
  }

  const divisionCounts = new Map<string, number>();
  for (const a of assignments) {
    divisionCounts.set(
      a.divisionKey,
      (divisionCounts.get(a.divisionKey) ?? 0) + 1,
    );
  }

  let expectedPairs = 0;
  let expectedUnmatched = 0;
  for (const count of divisionCounts.values()) {
    expectedPairs += Math.floor(count / 2);
    expectedUnmatched += count % 2;
  }

  console.info("");
  console.info("========== setup-bracket-demo-data 요약 ==========");
  console.info(`대상 대회: ${event.title} (${event.publicSlug ?? event.id})`);
  console.info(`created gyms: ${gymsCreated}`);
  console.info(`repaired gyms: ${gymsRepaired}`);
  console.info(`created fighters: ${fightersCreated}`);
  console.info(`updated fighters: ${fightersUpdated}`);
  console.info(`linked histories: ${historiesLinked}`);
  console.info(`created approved applications: ${applicationsCreated}`);
  console.info(`updated approved applications: ${applicationsUpdated}`);
  console.info(`divisions used: ${DIVISION_PLAN.length} (created ${divisionsCreated}, reused ${divisionsReused})`);
  console.info(`expected matched pairs: ${expectedPairs}`);
  console.info(`expected unmatched candidates: ${expectedUnmatched}`);
  console.info("");
  console.info("※ 크레딧 ledger 미발생 — EventApplication 직접 upsert");
  console.info("※ db:seed / truncate / hard delete 없음");
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
