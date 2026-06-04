/**
 * 실무 미팅용 데모 계정: Supabase Auth + DB User·프로필 매핑.
 * service role 키는 본 스크립트에서만 사용합니다(클라이언트 번들 금지).
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
import { EventStatus } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import { repairGymFighterAffiliations } from "./lib/repair-gym-affiliation";

const DEMO_ACCOUNTS = [
  {
    role: UserRole.admin,
    loginId: "admin",
    email: "admin@demo.local",
    name: "관리자",
    dashboard: "/admin",
  },
  {
    role: UserRole.organizer,
    loginId: "organizer",
    email: "organizer@demo.local",
    name: "대회 주최자",
    dashboard: "/organizer",
  },
  {
    role: UserRole.gym,
    loginId: "gym",
    email: "gym@demo.local",
    name: "데모 체육관",
    dashboard: "/gym",
  },
  {
    role: UserRole.fighter,
    loginId: "fighter",
    email: "fighter@demo.local",
    name: "데모 선수",
    dashboard: "/fighter",
  },
] as const;

const DEMO_FIGHTER_CODE = "FTR-2026-DEMO001";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isLikelyPasswordPolicyError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("password") &&
    (m.includes("short") ||
      m.includes("long") ||
      m.includes("weak") ||
      m.includes("policy") ||
      m.includes("least") ||
      m.includes("characters") ||
      m.includes("invalid"))
  );
}

function printPasswordPolicyHelp(): void {
  console.error("");
  console.error(
    "[안내] Supabase 프로젝트의 비밀번호 정책 때문에 기본값(1234)이 거절될 수 있습니다.",
  );
  console.error(
    "  → Supabase 대시보드에서 정책을 완화하지 말고, 환경 변수로 더 긴 비밀번호를 지정한 뒤 다시 실행하세요.",
  );
  console.error("  예: DEMO_PASSWORD=123456   또는   DEMO_PASSWORD=Demo1234!");
  console.error("  문서: docs/dev-start.md 의 데모 계정 절을 참고하세요.");
  console.error("");
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email?: string | null } | null> {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data.users.find((u) => normalizeEmail(u.email ?? "") === target);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
): Promise<{ id: string; created: boolean; passwordUpdated: boolean }> {
  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) {
    let passwordUpdated = false;
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      if (isLikelyPasswordPolicyError(error.message)) {
        printPasswordPolicyHelp();
        throw new Error(
          `비밀번호 갱신 실패 (${email}): ${error.message}\n` +
            "위 안내에 따라 DEMO_PASSWORD를 변경한 뒤 재실행하세요.",
        );
      }
      console.warn(
        `[경고] 기존 Auth 사용자 비밀번호 갱신 생략 (${email}): ${error.message}`,
      );
      console.warn(
        "  → 로그인에 실패하면 Supabase에서 비밀번호를 재설정하거나, DEMO_PASSWORD를 바꿔 스크립트를 다시 실행하세요.",
      );
    } else {
      passwordUpdated = true;
    }
    return { id: existing.id, created: false, passwordUpdated };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizeEmail(email),
    password,
    email_confirm: true,
  });
  if (error) {
    const msg = error.message;
    const duplicate =
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered") ||
      msg.toLowerCase().includes("exists");
    if (duplicate) {
      const again = await findAuthUserByEmail(supabase, email);
      if (again) {
        console.warn(
          `[경고] createUser 충돌 후 기존 사용자를 재사용합니다: ${email}`,
        );
        return { id: again.id, created: false, passwordUpdated: false };
      }
    }
    if (isLikelyPasswordPolicyError(msg)) {
      printPasswordPolicyHelp();
    }
    throw new Error(`Auth 사용자 생성 실패 (${email}): ${msg}`);
  }
  if (!data.user?.id) {
    throw new Error(`Auth 사용자 생성 응답에 id가 없습니다: ${email}`);
  }
  return { id: data.user.id, created: true, passwordUpdated: true };
}

async function ensureFighterGymHistory(
  fighterId: string,
  gymId: string,
): Promise<void> {
  const active = await prisma.fighterGymHistory.findFirst({
    where: {
      fighterId,
      gymId,
      endDate: null,
      status: "active",
    },
  });
  if (!active) {
    await prisma.fighterGymHistory.create({
      data: {
        fighterId,
        gymId,
        status: "active",
      },
    });
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DEMO_PASSWORD?.trim() || "123456!!";

  if (!url?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
  }
  if (!serviceKey?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.info("[setup-demo-users] Supabase Auth + Prisma DB 동기화 시작…");
  console.info(
    `  비밀번호 소스: ${process.env.DEMO_PASSWORD ? "DEMO_PASSWORD" : '기본값 "123456!!"'}`,
  );

  const authIds: Record<string, string> = {};
  const authMeta: Record<string, { created: boolean; passwordUpdated: boolean }> =
    {};

  for (const row of DEMO_ACCOUNTS) {
    const r = await ensureAuthUser(supabase, row.email, password);
    authIds[row.email] = r.id;
    authMeta[row.email] = {
      created: r.created,
      passwordUpdated: r.passwordUpdated,
    };
  }

  // --- Admin ---
  const adminRow = DEMO_ACCOUNTS[0]!;
  const adminAuthId = authIds[adminRow.email]!;
  await prisma.user.upsert({
    where: { email: adminRow.email },
    create: {
      email: adminRow.email,
      loginId: adminRow.loginId,
      authUserId: adminAuthId,
      name: adminRow.name,
      role: UserRole.admin,
    },
    update: {
      authUserId: adminAuthId,
      loginId: adminRow.loginId,
      name: adminRow.name,
      role: UserRole.admin,
    },
  });

  // --- Organizer ---
  const orgRow = DEMO_ACCOUNTS[1]!;
  const orgAuthId = authIds[orgRow.email]!;
  const orgUser = await prisma.user.upsert({
    where: { email: orgRow.email },
    create: {
      email: orgRow.email,
      loginId: orgRow.loginId,
      authUserId: orgAuthId,
      name: orgRow.name,
      role: UserRole.organizer,
    },
    update: {
      authUserId: orgAuthId,
      loginId: orgRow.loginId,
      name: orgRow.name,
      role: UserRole.organizer,
    },
  });
  await prisma.organizer.upsert({
    where: { userId: orgUser.id },
    create: {
      userId: orgUser.id,
      name: orgRow.name,
      type: OrganizerType.association,
      status: OrganizerStatus.active,
    },
    update: {
      name: orgRow.name,
      type: OrganizerType.association,
      status: OrganizerStatus.active,
    },
  });

  const demoOrganizer = await prisma.organizer.findUnique({
    where: { userId: orgUser.id },
    select: { id: true },
  });
  if (demoOrganizer) {
    const linked = await prisma.event.updateMany({
      where: { publicSlug: "sample-open-2026" },
      data: { organizerId: demoOrganizer.id },
    });
    if (linked.count > 0) {
      console.info(
        "[setup-demo-users] sample-open-2026 대회를 데모 주최자 소유로 연결했습니다.",
      );
    }
  }

  // --- Gym ---
  const gymRow = DEMO_ACCOUNTS[2]!;
  const gymAuthId = authIds[gymRow.email]!;
  const gymUser = await prisma.user.upsert({
    where: { email: gymRow.email },
    create: {
      email: gymRow.email,
      loginId: gymRow.loginId,
      authUserId: gymAuthId,
      name: gymRow.name,
      role: UserRole.gym,
    },
    update: {
      authUserId: gymAuthId,
      loginId: gymRow.loginId,
      name: gymRow.name,
      role: UserRole.gym,
    },
  });
  const gym = await prisma.gym.upsert({
    where: { ownerUserId: gymUser.id },
    create: {
      ownerUserId: gymUser.id,
      name: gymRow.name,
      phone: "01000000001",
      address: "데모 주소",
      status: GymStatus.active,
    },
    update: {
      name: gymRow.name,
      status: GymStatus.active,
    },
  });

  // --- Fighter ---
  const fighterRow = DEMO_ACCOUNTS[3]!;
  const fighterAuthId = authIds[fighterRow.email]!;
  const fighterUser = await prisma.user.upsert({
    where: { email: fighterRow.email },
    create: {
      email: fighterRow.email,
      loginId: fighterRow.loginId,
      authUserId: fighterAuthId,
      name: fighterRow.name,
      role: UserRole.fighter,
      mustChangePassword: false,
    },
    update: {
      authUserId: fighterAuthId,
      loginId: fighterRow.loginId,
      name: fighterRow.name,
      role: UserRole.fighter,
    },
  });

  const fighter = await prisma.fighter.upsert({
    where: { fighterCode: DEMO_FIGHTER_CODE },
    create: {
      fighterCode: DEMO_FIGHTER_CODE,
      userId: fighterUser.id,
      currentGymId: gym.id,
      name: fighterRow.name,
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      gender: "male",
      phone: "01000000000",
      status: FighterStatus.active,
      recordWin: 0,
      recordLoss: 0,
      recordDraw: 0,
    },
    update: {
      userId: fighterUser.id,
      currentGymId: gym.id,
      name: fighterRow.name,
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      gender: "male",
      phone: "01000000000",
      status: FighterStatus.active,
    },
  });

  await ensureFighterGymHistory(fighter.id, gym.id);

  // 일반 아이디 데모 선수 (fighterdemo / 123456!!)
  const DEMO_LOGIN_ID = "fighterdemo";
  const demoLoginEmail = `${DEMO_LOGIN_ID}@internal.matchlab.local`;
  const demoAuth = await ensureAuthUser(supabase, demoLoginEmail, password);
  const demoUser = await prisma.user.upsert({
    where: { loginId: DEMO_LOGIN_ID },
    create: {
      email: demoLoginEmail,
      authUserId: demoAuth.id,
      loginId: DEMO_LOGIN_ID,
      name: "데모 아이디 선수",
      role: UserRole.fighter,
      mustChangePassword: false,
    },
    update: {
      authUserId: demoAuth.id,
      email: demoLoginEmail,
      name: "데모 아이디 선수",
      role: UserRole.fighter,
    },
  });
  const demoFighterByLogin = await prisma.fighter.upsert({
    where: { fighterCode: "FTR-2026-DEMO002" },
    create: {
      fighterCode: "FTR-2026-DEMO002",
      userId: demoUser.id,
      currentGymId: gym.id,
      name: "아이디 데모 선수",
      birthDate: new Date("2001-06-15T00:00:00.000Z"),
      gender: "female",
      phone: "01000000002",
      status: FighterStatus.active,
    },
    update: {
      userId: demoUser.id,
      currentGymId: gym.id,
      status: FighterStatus.active,
    },
  });
  await ensureFighterGymHistory(demoFighterByLogin.id, gym.id);
  console.info(
    `[setup-demo-users] 일반 아이디 선수: loginId=${DEMO_LOGIN_ID} (이메일 로그인 아님)`,
  );

  const repaired = await repairGymFighterAffiliations(gym.id);
  if (repaired > 0) {
    console.info(
      `[setup-demo-users] 체육관 소속 currentGymId 동기화: ${repaired}명`,
    );
  }

  await prisma.event.updateMany({
    where: { publicSlug: "sample-open-2026" },
    data: {
      status: EventStatus.open,
      registrationEndDate: new Date("2026-12-31T23:59:59.000Z"),
    },
  });

  console.info("");
  console.info("========== 데모 계정 (로그인: /login — 아이디 + 비밀번호) ==========");
  for (const row of DEMO_ACCOUNTS) {
    const meta = authMeta[row.email]!;
    const pwdNote =
      meta.passwordUpdated === true
        ? "비밀번호: DEMO_PASSWORD(또는 기본 123456!!)로 설정됨"
        : "비밀번호: 기존 Supabase 값 유지(갱신 실패 시 수동 확인)";
    console.info(
      `${row.role.padEnd(10)} loginId=${row.loginId.padEnd(12)} (이메일 ${row.email})  → ${row.dashboard}`,
    );
    console.info(`           ${pwdNote}`);
  }
  console.info(
    `fighter      loginId=${DEMO_LOGIN_ID.padEnd(12)} (내부 auth email)  → /fighter`,
  );
  console.info("================================================================");
  console.info("");
  console.info(
    "완료. /login 에서 loginId(예: admin, gym, fighter, fighterdemo)로 로그인하세요.",
  );
  console.info("  레거시 이메일(admin@demo.local 등) 로그인도 동일 비밀번호로 유지됩니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
