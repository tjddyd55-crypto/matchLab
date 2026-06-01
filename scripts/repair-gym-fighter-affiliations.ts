/**
 * 데모·운영 DB에서 체육관–선수 소속 불일치 복구(데이터 삭제 없음).
 *
 * 사용: DATABASE_URL 설정 후 `npm run repair:demo-gym`
 * db:seed 는 실행하지 마세요.
 */
import "dotenv/config";

import { EventStatus } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import { repairGymFighterAffiliations } from "./lib/repair-gym-affiliation";

const DEMO_GYM_EMAIL = "gym@demo.local";

async function extendSampleOpenRegistration(): Promise<void> {
  const end = new Date("2026-12-31T23:59:59.000Z");
  const updated = await prisma.event.updateMany({
    where: { publicSlug: "sample-open-2026" },
    data: {
      status: EventStatus.open,
      registrationEndDate: end,
    },
  });
  if (updated.count > 0) {
    console.info(
      `[repair] sample-open-2026 신청 마감일을 ${end.toISOString()} 로 연장했습니다.`,
    );
  }
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
      `데모 체육관(${DEMO_GYM_EMAIL})이 없습니다. 먼저 npm run setup:demo-users 를 실행하세요.`,
    );
    process.exit(1);
  }

  const gym = gymUser.ownedGym;
  const repaired = await repairGymFighterAffiliations(gym.id);
  const affiliated = await prisma.fighter.count({
    where: {
      OR: [
        { currentGymId: gym.id },
        {
          gymHistories: {
            some: { gymId: gym.id, status: "active", endDate: null },
          },
        },
      ],
    },
  });

  await extendSampleOpenRegistration();

  console.info(`[repair] 체육관: ${gym.name} (${gym.id})`);
  console.info(`[repair] currentGymId 동기화: ${repaired}명`);
  console.info(`[repair] 소속 조회 가능 선수(중복 OR 포함): ${affiliated}명`);
  console.info(
    `[repair] User.authUserId 연결: ${gymUser.authUserId ? "있음" : "없음 — setup:demo-users 필요"}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
