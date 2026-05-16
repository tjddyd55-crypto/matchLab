/**
 * 데모 체육관(gym@demo.local) 소속 테스트 선수 20명 추가.
 * - Supabase Auth 계정 없음(userId null) — 대회 신청·대진표 테스트용
 * - fighterCode FTR-2026-TEST001 ~ TEST020 기준 upsert
 * - 기존 데이터 wipe 없음
 */
import "dotenv/config";

import { FighterStatus } from "../src/generated/prisma";
import { toUtcDateOnly } from "../src/lib/date-only";
import { prisma } from "../src/lib/prisma";

const DEMO_GYM_EMAIL = "gym@demo.local";

const NAMES = [
  "김민준",
  "이서준",
  "박도윤",
  "최하준",
  "정시우",
  "강지호",
  "조현우",
  "윤건우",
  "장유찬",
  "임태오",
  "한지훈",
  "오민성",
  "서준호",
  "신도현",
  "권태민",
  "황민재",
  "안재원",
  "송유준",
  "홍시윤",
  "문지후",
] as const;

const WEIGHTS_KG = [55, 60, 65, 70, 75, 80, 85, 90] as const;

/** 더미 번호 — 실제 휴대폰 아님 */
function dummyPhone(seq: number): string {
  return `0109000${String(seq).padStart(4, "0")}`;
}

function birthDateForIndex(index: number): Date {
  if (index === 18) {
    return toUtcDateOnly(new Date("2009-03-10"));
  }
  if (index === 19) {
    return toUtcDateOnly(new Date("2010-07-22"));
  }
  const year = 1998 + (index % 8);
  const month = index % 12;
  const day = 1 + (index % 27);
  return toUtcDateOnly(new Date(year, month, day));
}

function genderForIndex(index: number): string {
  return index < 16 ? "male" : "female";
}

async function ensureActiveGymHistory(
  fighterId: string,
  gymId: string,
): Promise<void> {
  const existing = await prisma.fighterGymHistory.findFirst({
    where: {
      fighterId,
      gymId,
      status: "active",
      endDate: null,
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.fighterGymHistory.create({
    data: {
      fighterId,
      gymId,
      status: "active",
    },
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL이 설정되지 않았습니다.");
    process.exit(1);
  }

  const gymUser = await prisma.user.findUnique({
    where: { email: DEMO_GYM_EMAIL },
    include: { ownedGym: true },
  });

  if (!gymUser?.ownedGym) {
    console.error(
      "데모 체육관이 없습니다. 먼저 npm run setup:demo-users를 실행하세요.",
    );
    process.exit(1);
  }

  const gym = gymUser.ownedGym;
  let created = 0;
  let updated = 0;

  console.info(
    `[seed-demo-fighters] 체육관: ${gym.name} (${gym.id}) — 선수 20명 upsert`,
  );

  for (let i = 0; i < NAMES.length; i++) {
    const seq = i + 1;
    const fighterCode = `FTR-2026-TEST${String(seq).padStart(3, "0")}`;
    const existing = await prisma.fighter.findUnique({
      where: { fighterCode },
      select: { id: true },
    });

    const payload = {
      fighterCode,
      userId: null as string | null,
      name: NAMES[i]!,
      birthDate: birthDateForIndex(i),
      gender: genderForIndex(i),
      phone: dummyPhone(seq),
      height: 168 + (i % 15),
      weight: WEIGHTS_KG[i % WEIGHTS_KG.length]!,
      profileImageUrl: null as string | null,
      schoolName: null as string | null,
      grade: null as string | null,
      guardianName: null as string | null,
      guardianPhone: null as string | null,
      recordWin: i % 4,
      recordLoss: (i + 1) % 4,
      recordDraw: i % 3,
      status: FighterStatus.active,
      currentGymId: gym.id,
    };

    const fighter = await prisma.fighter.upsert({
      where: { fighterCode },
      create: payload,
      update: {
        name: payload.name,
        birthDate: payload.birthDate,
        gender: payload.gender,
        phone: payload.phone,
        height: payload.height,
        weight: payload.weight,
        profileImageUrl: null,
        schoolName: null,
        grade: null,
        guardianName: null,
        guardianPhone: null,
        recordWin: payload.recordWin,
        recordLoss: payload.recordLoss,
        recordDraw: payload.recordDraw,
        status: FighterStatus.active,
        currentGymId: gym.id,
      },
    });

    await ensureActiveGymHistory(fighter.id, gym.id);

    if (existing) updated += 1;
    else created += 1;
  }

  const totalAtGym = await prisma.fighter.count({
    where: { currentGymId: gym.id, status: FighterStatus.active },
  });

  console.info("[seed-demo-fighters] 완료", {
    fighterCodes: "FTR-2026-TEST001 ~ FTR-2026-TEST020",
    created,
    updated,
    upserted: NAMES.length,
    activeFightersAtDemoGym: totalAtGym,
  });
}

main()
  .catch((e) => {
    console.error("[seed-demo-fighters] 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
