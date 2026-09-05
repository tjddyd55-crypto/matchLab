/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  EventStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES } from "@/lib/public-official-result";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const excludedPublicEventStatuses: EventStatus[] = [
  EventStatus.draft,
  EventStatus.cancelled,
];

/** MVP: 공식 전적 집계는 확정·정정 행만 포함하고 `no_contest`는 승·패·무 카운트에 넣지 않는다. */
const countableStatuses = PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES;

async function recalculateOneFighterRecordCache(
  fighterId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const c = db(tx);
  const wins = await c.matchResult.count({
    where: {
      fighterId,
      status: { in: countableStatuses },
      result: MatchRecordOutcome.win,
    },
  });
  const losses = await c.matchResult.count({
    where: {
      fighterId,
      status: { in: countableStatuses },
      result: MatchRecordOutcome.loss,
    },
  });
  const draws = await c.matchResult.count({
    where: {
      fighterId,
      status: { in: countableStatuses },
      result: MatchRecordOutcome.draw,
    },
  });

  await fighterRepository.updateFighterRecordCache(
    fighterId,
    { recordWin: wins, recordLoss: losses, recordDraw: draws },
    tx,
  );
}

export const resultRepository = {
  async findResultsByMatchId(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchResult.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });
  },

  async findOfficialResultsByMatchId(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchResult.findMany({
      where: {
        matchId,
        status: { in: countableStatuses },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async findConfirmedResultsByMatchId(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchResult.findMany({
      where: {
        matchId,
        status: MatchRecordStatus.confirmed,
      },
    });
  },

  async createMatchResults(
    rows: Prisma.MatchResultCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (rows.length === 0) return;
    await db(tx).matchResult.createMany({ data: rows });
  },

  async updateMatchResultStatus(
    matchResultId: string,
    data: Prisma.MatchResultUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).matchResult.update({
      where: { id: matchResultId },
      data,
    });
  },

  async createMatchResultChangeLog(
    row: {
      matchResultId: string;
      matchId: string;
      changedByUserId?: string | null;
      changedByStaffLinkId?: string | null;
      beforeResult: Prisma.InputJsonValue;
      afterResult: Prisma.InputJsonValue;
      reason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).matchResultChangeLog.create({
      data: {
        matchResultId: row.matchResultId,
        matchId: row.matchId,
        changedByUserId: row.changedByUserId ?? null,
        changedByStaffLinkId: row.changedByStaffLinkId ?? null,
        beforeResult: row.beforeResult,
        afterResult: row.afterResult,
        reason: row.reason ?? null,
      },
    });
  },

  async listResultsByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchResult.findMany({
      where: { eventId },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      include: {
        match: {
          select: {
            id: true,
            matchNumber: true,
            matNumber: true,
            roundName: true,
            bracket: {
              select: { id: true, title: true, type: true },
            },
          },
        },
        fighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
        opponentFighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
      },
    });
  },

  async listPublicResultsByEventSlug(slug: string, tx?: Prisma.TransactionClient) {
    const event = await db(tx).event.findFirst({
      where: {
        publicSlug: slug,
        status: { notIn: excludedPublicEventStatuses },
      },
      select: { id: true, title: true },
    });
    if (!event) return [];

    return db(tx).matchResult.findMany({
      where: {
        eventId: event.id,
        status: { in: PUBLIC_OFFICIAL_MATCH_RESULT_STATUSES },
      },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        matchId: true,
        bracketId: true,
        fighterId: true,
        opponentFighterId: true,
        result: true,
        resultType: true,
        eventTitleSnapshot: true,
        fighterSnapshot: true,
        opponentSnapshot: true,
        divisionSnapshot: true,
        matchDate: true,
        status: true,
        updatedAt: true,
        match: {
          select: {
            matchNumber: true,
            matNumber: true,
            fighterRedId: true,
            fighterBlueId: true,
            bracket: { select: { title: true, type: true } },
          },
        },
      },
    });
  },

  async listResultsByFighter(fighterId: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchResult.findMany({
      where: {
        fighterId,
        status: { in: countableStatuses },
      },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      include: {
        match: {
          select: {
            matchNumber: true,
            matNumber: true,
            bracket: { select: { title: true, type: true } },
          },
        },
        event: { select: { id: true, title: true, publicSlug: true } },
        opponentFighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
      },
    });
  },

  async listResultsByGymFighters(
    fighterIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (fighterIds.length === 0) return [];
    return db(tx).matchResult.findMany({
      where: {
        fighterId: { in: fighterIds },
        status: { in: countableStatuses },
      },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      include: {
        fighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
          },
        },
        match: {
          select: {
            matchNumber: true,
            matNumber: true,
            bracket: { select: { title: true, type: true } },
          },
        },
        event: { select: { id: true, title: true, publicSlug: true } },
        opponentFighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
      },
    });
  },

  async recalculateFighterRecordCache(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await recalculateOneFighterRecordCache(fighterId, tx);
  },

  async recalculateManyFighterRecordCaches(
    fighterIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const uniq = [...new Set(fighterIds)].filter(Boolean);
    for (const id of uniq) {
      await recalculateOneFighterRecordCache(id, tx);
    }
  },
};
