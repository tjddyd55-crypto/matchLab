import type { Prisma } from "@/generated/prisma";
import {
  BracketMatchOutcomeStyle,
  FighterCareerRecordStatus,
  MatchRecordOutcome,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type CreateFighterCareerMatchRecordInput = {
  fighterId: string;
  eventId: string;
  matchId: string;
  eventArchiveId: string;
  archiveVersion: number;
  matchResultId?: string | null;
  opponentFighterId?: string | null;
  result: MatchRecordOutcome;
  resultType?: BracketMatchOutcomeStyle | null;
  sportType?: string | null;
  divisionLabel?: string | null;
  divisionSnapshot?: Prisma.InputJsonValue | null;
  fighterNameSnapshot: string;
  opponentNameSnapshot?: string | null;
  gymNameSnapshot?: string | null;
  opponentGymNameSnapshot?: string | null;
  eventNameSnapshot: string;
  eventDateSnapshot: Date;
  matchNumber?: number | null;
};

export type FighterCareerStatsUpsertInput = {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalMatches: number;
  knockouts: number;
  submissions: number;
  decisions: number;
  lastMatchAt: Date | null;
};

export const fighterCareerRepository = {
  async countByEventArchiveId(
    eventArchiveId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).fighterCareerMatchRecord.count({
      where: { eventArchiveId, status: FighterCareerRecordStatus.active },
    });
  },

  async createMany(
    rows: CreateFighterCareerMatchRecordInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const data = rows.map((row) => ({
      ...row,
      divisionSnapshot:
        row.divisionSnapshot === null ? undefined : row.divisionSnapshot,
    }));
    const result = await db(tx).fighterCareerMatchRecord.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  },

  async voidByEventArchiveId(
    eventArchiveId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const now = new Date();
    const result = await db(tx).fighterCareerMatchRecord.updateMany({
      where: {
        eventArchiveId,
        status: FighterCareerRecordStatus.active,
      },
      data: {
        status: FighterCareerRecordStatus.voided,
        voidedAt: now,
      },
    });
    return result.count;
  },

  async listActiveByFighterId(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).fighterCareerMatchRecord.findMany({
      where: {
        fighterId,
        status: FighterCareerRecordStatus.active,
      },
      orderBy: [{ eventDateSnapshot: "desc" }, { matchNumber: "asc" }],
    });
  },

  async listActiveForStatsByFighterId(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).fighterCareerMatchRecord.findMany({
      where: {
        fighterId,
        status: FighterCareerRecordStatus.active,
      },
      select: {
        result: true,
        resultType: true,
        eventDateSnapshot: true,
      },
    });
  },

  async findDistinctFighterIdsByEventArchiveId(
    eventArchiveId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const rows = await db(tx).fighterCareerMatchRecord.findMany({
      where: { eventArchiveId, status: FighterCareerRecordStatus.active },
      select: { fighterId: true },
      distinct: ["fighterId"],
    });
    return rows.map((r) => r.fighterId);
  },

  async upsertStats(
    fighterId: string,
    stats: FighterCareerStatsUpsertInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).fighterCareerStats.upsert({
      where: { fighterId },
      create: { fighterId, ...stats },
      update: stats,
    });
  },

  async findStatsByFighterId(fighterId: string, tx?: Prisma.TransactionClient) {
    return db(tx).fighterCareerStats.findUnique({ where: { fighterId } });
  },

  async findStatsByFighterIds(fighterIds: string[], tx?: Prisma.TransactionClient) {
    if (fighterIds.length === 0) return [];
    return db(tx).fighterCareerStats.findMany({
      where: { fighterId: { in: fighterIds } },
    });
  },
};
