import type { Prisma } from "@/generated/prisma";
import { FighterStatus } from "@/generated/prisma";

function affiliatedWithGymOr(gymId: string): Prisma.FighterWhereInput["OR"] {
  return [
    { currentGymId: gymId },
    {
      gymHistories: {
        some: {
          gymId,
          status: "active",
          endDate: null,
        },
      },
    },
  ];
}

/** 체육관 소속 선수 목록(상태 무관). history만 있는 복구 누락 케이스 포함. */
export function fighterAffiliatedWithGymWhere(
  gymId: string,
): Prisma.FighterWhereInput {
  return { OR: affiliatedWithGymOr(gymId) };
}

/** 대회 신청 등 활성 선수만. */
export function activeFighterAffiliatedWithGymWhere(
  gymId: string,
): Prisma.FighterWhereInput {
  return {
    status: FighterStatus.active,
    OR: affiliatedWithGymOr(gymId),
  };
}
