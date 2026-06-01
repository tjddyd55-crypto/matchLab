import { prisma } from "../../src/lib/prisma";

/** FighterGymHistory(active) 기준으로 currentGymId 동기화. 삭제 없음. */
export async function repairGymFighterAffiliations(
  gymId: string,
): Promise<number> {
  const histories = await prisma.fighterGymHistory.findMany({
    where: {
      gymId,
      status: "active",
      endDate: null,
    },
    select: { fighterId: true },
    distinct: ["fighterId"],
  });

  let repaired = 0;
  for (const { fighterId } of histories) {
    const result = await prisma.fighter.updateMany({
      where: {
        id: fighterId,
        OR: [{ currentGymId: null }, { currentGymId: { not: gymId } }],
      },
      data: { currentGymId: gymId },
    });
    repaired += result.count;
  }
  return repaired;
}
