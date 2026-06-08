/**
 * 테스트용 주최자·체육관·선수 계정 복구 (idempotent upsert).
 *
 * - organizer1~3 + gym + gym1~gym7 계정 (Supabase Auth + Prisma)
 * - 체육관별 FTR-BKT-* 선수 10명 (총 80명)
 * - Fighter.currentGymId + FighterGymHistory(active) 동기화
 *
 * 금지: db:seed, truncate, hard delete, approveEventApplication, 크레딧 ledger
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import {
  FighterStatus,
  GymStatus,
  OrganizerStatus,
  OrganizerType,
  UserRole,
} from "../src/generated/prisma";
import { toUtcDateOnly } from "../src/lib/date-only";
import { activeFighterAffiliatedWithGymWhere } from "../src/lib/gym-affiliation";
import { prisma } from "../src/lib/prisma";
import { repairGymFighterAffiliations } from "./lib/repair-gym-affiliation";

const DEMO_PASSWORD_FALLBACK = "123456!!";
const FIGHTERS_PER_GYM = 10;

const ORGANIZER_ACCOUNTS = [
  { loginId: "organizer1", email: "organizer1@demo.local", name: "데모 주최자 1" },
  { loginId: "organizer2", email: "organizer2@demo.local", name: "데모 주최자 2" },
  { loginId: "organizer3", email: "organizer3@demo.local", name: "데모 주최자 3" },
] as const;

const GYM_ACCOUNTS = [
  { loginId: "gym", email: "gym@demo.local", name: "데모 체육관" },
  { loginId: "gym1", email: "gym1@demo.local", name: "데모 체육관 1" },
  { loginId: "gym2", email: "gym2@demo.local", name: "데모 체육관 2" },
  { loginId: "gym3", email: "gym3@demo.local", name: "데모 체육관 3" },
  { loginId: "gym4", email: "gym4@demo.local", name: "데모 체육관 4" },
  { loginId: "gym5", email: "gym5@demo.local", name: "데모 체육관 5" },
  { loginId: "gym6", email: "gym6@demo.local", name: "데모 체육관 6" },
  { loginId: "gym7", email: "gym7@demo.local", name: "데모 체육관 7" },
] as const;

type FighterTemplate = {
  primarySport: string;
  gender: string;
  ageGroup: string;
  weight: number;
  birthYear: number;
};

/** 체육관 내 10명 — 종목·성별·연령부·체중 분산 */
const FIGHTER_TEMPLATES: FighterTemplate[] = [
  { primarySport: "kickboxing", gender: "male", ageGroup: "초등부", weight: 30, birthYear: 2016 },
  { primarySport: "boxing", gender: "female", ageGroup: "초등부", weight: 35, birthYear: 2016 },
  { primarySport: "muaythai", gender: "male", ageGroup: "중등부", weight: 45, birthYear: 2013 },
  { primarySport: "kickboxing", gender: "female", ageGroup: "중등부", weight: 50, birthYear: 2013 },
  { primarySport: "boxing", gender: "male", ageGroup: "고등부", weight: 55, birthYear: 2010 },
  { primarySport: "muaythai", gender: "female", ageGroup: "고등부", weight: 60, birthYear: 2010 },
  { primarySport: "kickboxing", gender: "male", ageGroup: "대학·일반부", weight: 65, birthYear: 2002 },
  { primarySport: "boxing", gender: "male", ageGroup: "대학·일반부", weight: 70, birthYear: 2001 },
  { primarySport: "muaythai", gender: "female", ageGroup: "대학·일반부", weight: 75, birthYear: 2000 },
  { primarySport: "kickboxing", gender: "male", ageGroup: "대학·일반부", weight: 80, birthYear: 1999 },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fighterCodeTag(loginId: string): string {
  return loginId === "gym" ? "GYM" : loginId.toUpperCase();
}

function fighterCodeFor(loginId: string, seq: number): string {
  return `FTR-BKT-${fighterCodeTag(loginId)}-${String(seq).padStart(2, "0")}`;
}

function fighterDisplayName(loginId: string, seq: number): string {
  const num = String(seq).padStart(2, "0");
  return `${fighterCodeTag(loginId)} 선수 ${num}`;
}

function dummyPhone(loginId: string, seq: number): string {
  const gymNum = loginId === "gym" ? "00" : loginId.replace("gym", "").padStart(2, "0");
  return `0109${gymNum}${String(seq).padStart(3, "0")}`;
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
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.warn(`[경고] Auth 비밀번호 갱신 생략 (${email}): ${error.message}`);
    }
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
): Promise<"created" | "updated" | "exists"> {
  const active = await prisma.fighterGymHistory.findFirst({
    where: { fighterId, status: "active", endDate: null },
    select: { id: true, gymId: true },
  });

  if (!active) {
    await prisma.fighterGymHistory.create({
      data: { fighterId, gymId, status: "active" },
    });
    return "created";
  }

  if (active.gymId !== gymId) {
    await prisma.fighterGymHistory.update({
      where: { id: active.id },
      data: { gymId },
    });
    return "updated";
  }

  return "exists";
}

async function ensureOrganizerAccount(
  supabase: ReturnType<typeof createClient>,
  row: (typeof ORGANIZER_ACCOUNTS)[number],
  password: string,
): Promise<{ created: boolean }> {
  const auth = await ensureAuthUser(supabase, row.email, password);
  const authUser = await findAuthUserByEmail(supabase, row.email);
  if (!authUser) throw new Error(`Auth 사용자 없음: ${row.email}`);

  const user = await prisma.user.upsert({
    where: { loginId: row.loginId },
    create: {
      email: row.email,
      loginId: row.loginId,
      authUserId: authUser.id,
      name: row.name,
      role: UserRole.organizer,
    },
    update: {
      email: row.email,
      authUserId: authUser.id,
      name: row.name,
      role: UserRole.organizer,
    },
  });

  await prisma.organizer.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      name: row.name,
      type: OrganizerType.association,
      status: OrganizerStatus.active,
    },
    update: {
      name: row.name,
      type: OrganizerType.association,
      status: OrganizerStatus.active,
    },
  });

  return { created: auth.created };
}

async function ensureGymAccount(
  supabase: ReturnType<typeof createClient>,
  row: (typeof GYM_ACCOUNTS)[number],
  password: string,
): Promise<{ gymId: string; created: boolean }> {
  const auth = await ensureAuthUser(supabase, row.email, password);
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

  const gymSuffix = row.loginId === "gym" ? "0" : row.loginId.replace("gym", "");
  const gym = await prisma.gym.upsert({
    where: { ownerUserId: user.id },
    create: {
      ownerUserId: user.id,
      name: row.name,
      phone: `0108000${gymSuffix.padStart(4, "0").slice(-4)}`,
      address: "데모 주소",
      status: GymStatus.active,
    },
    update: {
      name: row.name,
      status: GymStatus.active,
    },
  });

  return { gymId: gym.id, created: auth.created };
}

type GymSummary = {
  loginId: string;
  gymId: string;
  demoFighters: number;
  currentGymIdCount: number;
  activeHistories: number;
  managementCount: number;
};

async function countDemoFightersForGym(
  gymId: string,
  loginId: string,
): Promise<number> {
  const tag = fighterCodeTag(loginId);
  return prisma.fighter.count({
    where: {
      fighterCode: { startsWith: `FTR-BKT-${tag}-` },
      status: FighterStatus.active,
      OR: [
        { currentGymId: gymId },
        {
          gymHistories: {
            some: { gymId, status: "active", endDate: null },
          },
        },
      ],
    },
  });
}

async function summarizeGym(
  loginId: string,
  gymId: string,
): Promise<GymSummary> {
  const demoFighters = await countDemoFightersForGym(gymId, loginId);
  const currentGymIdCount = await prisma.fighter.count({
    where: { currentGymId: gymId, status: FighterStatus.active },
  });
  const activeHistories = await prisma.fighterGymHistory.count({
    where: { gymId, status: "active", endDate: null },
  });
  const managementCount = await prisma.fighter.count({
    where: activeFighterAffiliatedWithGymWhere(gymId),
  });

  return {
    loginId,
    gymId,
    demoFighters,
    currentGymIdCount,
    activeHistories,
    managementCount,
  };
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

  let organizersCreated = 0;
  for (const row of ORGANIZER_ACCOUNTS) {
    const { created } = await ensureOrganizerAccount(supabase, row, password);
    if (created) organizersCreated += 1;
  }

  let gymsCreated = 0;
  const gymIdByLogin = new Map<string, string>();

  for (const row of GYM_ACCOUNTS) {
    const { gymId, created } = await ensureGymAccount(supabase, row, password);
    gymIdByLogin.set(row.loginId, gymId);
    if (created) gymsCreated += 1;
  }

  let fightersCreated = 0;
  let fightersUpdated = 0;
  let historiesCreated = 0;
  let historiesUpdated = 0;

  for (const gymRow of GYM_ACCOUNTS) {
    const gymId = gymIdByLogin.get(gymRow.loginId);
    if (!gymId) continue;

    for (let seq = 1; seq <= FIGHTERS_PER_GYM; seq++) {
      const template = FIGHTER_TEMPLATES[(seq - 1) % FIGHTER_TEMPLATES.length]!;
      const code = fighterCodeFor(gymRow.loginId, seq);
      const name = fighterDisplayName(gymRow.loginId, seq);

      const existing = await prisma.fighter.findUnique({
        where: { fighterCode: code },
        select: { id: true },
      });

      const fighter = await prisma.fighter.upsert({
        where: { fighterCode: code },
        create: {
          fighterCode: code,
          userId: null,
          currentGymId: gymId,
          name,
          birthDate: toUtcDateOnly(
            new Date(`${template.birthYear}-06-${String(10 + seq).padStart(2, "0")}`),
          ),
          gender: template.gender,
          phone: dummyPhone(gymRow.loginId, seq),
          weight: template.weight,
          primarySport: template.primarySport,
          grade: template.ageGroup,
          status: FighterStatus.active,
          recordWin: 0,
          recordLoss: 0,
          recordDraw: 0,
        },
        update: {
          currentGymId: gymId,
          name,
          birthDate: toUtcDateOnly(
            new Date(`${template.birthYear}-06-${String(10 + seq).padStart(2, "0")}`),
          ),
          gender: template.gender,
          phone: dummyPhone(gymRow.loginId, seq),
          weight: template.weight,
          primarySport: template.primarySport,
          grade: template.ageGroup,
          status: FighterStatus.active,
        },
      });

      if (existing) fightersUpdated += 1;
      else fightersCreated += 1;

      const historyResult = await ensureActiveGymHistory(fighter.id, gymId);
      if (historyResult === "created") historiesCreated += 1;
      if (historyResult === "updated") historiesUpdated += 1;
    }

    const repaired = await repairGymFighterAffiliations(gymId);
    if (repaired > 0) {
      console.info(
        `[setup-demo-org-gym-fighters] ${gymRow.loginId} currentGymId 동기화: ${repaired}명`,
      );
    }
  }

  const gymSummaries: GymSummary[] = [];
  for (const gymRow of GYM_ACCOUNTS) {
    const gymId = gymIdByLogin.get(gymRow.loginId);
    if (!gymId) continue;
    gymSummaries.push(await summarizeGym(gymRow.loginId, gymId));
  }

  const existingOrganizer = await prisma.user.findFirst({
    where: { loginId: "organizer" },
    select: { loginId: true },
  });

  console.info("");
  console.info("========== Demo gym/fighter setup complete ==========");
  console.info("");
  console.info("Gym accounts:");
  for (const s of gymSummaries) {
    const ok = s.demoFighters === FIGHTERS_PER_GYM;
    const marker = ok ? "OK" : "WARN";
    console.info(
      `- ${s.loginId}: demoFighters=${s.demoFighters}, currentGymId=${s.currentGymIdCount}, activeHistories=${s.activeHistories}, /gym/fighters=${s.managementCount} [${marker}]`,
    );
    if (!ok) {
      console.warn(
        `  ⚠ ${s.loginId}: FTR-BKT-* 데모 선수가 ${FIGHTERS_PER_GYM}명이 아닙니다 (${s.demoFighters}명).`,
      );
    }
    if (s.managementCount < FIGHTERS_PER_GYM) {
      console.warn(
        `  ⚠ ${s.loginId}: /gym/fighters 조회(${s.managementCount}) < 기대 ${FIGHTERS_PER_GYM}명`,
      );
    }
  }

  console.info("");
  console.info("Organizer accounts:");
  if (existingOrganizer) {
    console.info("- organizer (기존 유지)");
  }
  for (const row of ORGANIZER_ACCOUNTS) {
    console.info(`- ${row.loginId}`);
  }

  console.info("");
  console.info("Upsert summary:");
  console.info(`- organizers created (auth): ${organizersCreated}`);
  console.info(`- gyms created (auth): ${gymsCreated}`);
  console.info(`- fighters created: ${fightersCreated}`);
  console.info(`- fighters updated: ${fightersUpdated}`);
  console.info(`- histories created: ${historiesCreated}`);
  console.info(`- histories updated: ${historiesUpdated}`);
  console.info("");
  console.info("※ db:seed / truncate / hard delete 없음");
  console.info("※ 대회 신청(EventApplication)은 setup:bracket-demo-data 별도 실행");
  console.info("=====================================================");
}

main()
  .catch((e) => {
    console.error("[setup-demo-org-gym-fighters] 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
