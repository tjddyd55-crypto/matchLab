/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  BracketMatchStatus,
  EventStatus,
  MatchRecordStatus,
  NextMatchSlot,
  Prisma as PrismaNs,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const FIELD_MODE_MATCH_STATUSES: BracketMatchStatus[] = [
  BracketMatchStatus.waiting,
  BracketMatchStatus.called,
  BracketMatchStatus.ongoing,
  BracketMatchStatus.delayed,
];

/** 현장 모드·진행 예정 경기 (종료·취소 제외) */
const UPCOMING_EVENT_STATUSES: EventStatus[] = [
  EventStatus.open,
  EventStatus.bracket_ready,
  EventStatus.ongoing,
];

export type MatchOwnershipContext = {
  matchId: string;
  bracketId: string;
  eventId: string;
  organizerId: string;
};

export const matchRepository = {
  async findMatchOwnershipContext(
    matchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<MatchOwnershipContext | null> {
    const row = await db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        bracketId: true,
        bracket: {
          select: {
            eventId: true,
            event: { select: { organizerId: true } },
          },
        },
      },
    });
    if (!row?.bracket?.event?.organizerId) return null;
    return {
      matchId: row.id,
      bracketId: row.bracketId,
      eventId: row.bracket.eventId,
      organizerId: row.bracket.event.organizerId,
    };
  },

  async listMatchesByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findMany({
      where: { bracket: { eventId } },
      orderBy: [
        { bracketId: "asc" },
        { globalMatchOrder: "asc" },
        { round: "asc" },
        { matchOrder: "asc" },
      ],
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: { select: { title: true, publicSlug: true } },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
        winner: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
          },
        },
        loser: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
          },
        },
        matchResults: {
          where: {
            status: {
              in: [
                MatchRecordStatus.confirmed,
                MatchRecordStatus.corrected,
                MatchRecordStatus.voided,
              ],
            },
          },
          select: {
            id: true,
            fighterId: true,
            result: true,
            status: true,
          },
        },
        court: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async listMatchesByBracket(bracketId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findMany({
      where: { bracketId },
      orderBy: [{ globalMatchOrder: "asc" }, { round: "asc" }, { matchOrder: "asc" }],
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: { select: { title: true, publicSlug: true } },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { name: true } },
          },
        },
        winner: { select: { id: true, fighterCode: true, name: true } },
        loser: { select: { id: true, fighterCode: true, name: true } },
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: {
            id: true,
            fighterId: true,
            result: true,
            status: true,
          },
        },
      },
    });
  },

  async findMatchById(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      include: {
        bracket: {
          select: {
            id: true,
            eventId: true,
            title: true,
            type: true,
            divisionId: true,
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { id: true, name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async findMatchWithBracketContext(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        bracketId: true,
        status: true,
        fighterRedId: true,
        fighterBlueId: true,
        winnerId: true,
        loserId: true,
        resultType: true,
        resultMemo: true,
        nextMatchId: true,
        nextMatchSlot: true,
        bracket: {
          select: {
            id: true,
            eventId: true,
            title: true,
            type: true,
            divisionId: true,
            event: { select: { title: true, publicSlug: true } },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { id: true, name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGym: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async selectMatchCorners(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      select: {
        fighterRedId: true,
        fighterBlueId: true,
        fighterRedSnapshot: true,
        fighterBlueSnapshot: true,
      },
    });
  },

  async updateMatchStatus(
    matchId: string,
    status: BracketMatchStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: { status },
    });
  },

  async updateMatchCourt(
    matchId: string,
    data: { courtId: string | null; courtOrder?: number | null },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: {
        courtId: data.courtId,
        courtOrder: data.courtOrder ?? null,
      },
    });
  },

  async updateMatchOutcomeDraft(
    matchId: string,
    data: {
      winnerId?: string | null;
      loserId?: string | null;
      resultType?: Prisma.BracketMatchUpdateInput["resultType"];
      resultMemo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: {
        winnerId: data.winnerId === undefined ? undefined : data.winnerId,
        loserId: data.loserId === undefined ? undefined : data.loserId,
        resultType: data.resultType === undefined ? undefined : data.resultType,
        resultMemo: data.resultMemo === undefined ? undefined : data.resultMemo,
      },
    });
  },

  async updateMatchOutcomeConfirmed(
    matchId: string,
    data: {
      status: BracketMatchStatus;
      winnerId: string | null;
      loserId: string | null;
      resultType: NonNullable<Prisma.BracketMatchUpdateInput["resultType"]>;
      resultMemo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: {
        status: data.status,
        winnerId: data.winnerId,
        loserId: data.loserId,
        resultType: data.resultType,
        resultMemo: data.resultMemo ?? null,
      },
    });
  },

  async clearMatchOfficialOutcome(
    matchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: {
        winnerId: null,
        loserId: null,
        resultType: null,
        resultMemo: null,
      },
    });
  },

  async updateNextMatchSlot(
    nextMatchId: string,
    slot: NextMatchSlot,
    fighterId: string,
    fighterSnapshot: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (slot === NextMatchSlot.red) {
      await db(tx).bracketMatch.update({
        where: { id: nextMatchId },
        data: {
          fighterRedId: fighterId,
          fighterRedSnapshot: fighterSnapshot,
        },
      });
      return;
    }
    await db(tx).bracketMatch.update({
      where: { id: nextMatchId },
      data: {
        fighterBlueId: fighterId,
        fighterBlueSnapshot: fighterSnapshot,
      },
    });
  },

  async clearNextMatchSlot(
    nextMatchId: string,
    slot: NextMatchSlot,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (slot === NextMatchSlot.red) {
      await db(tx).bracketMatch.update({
        where: { id: nextMatchId },
        data: {
          fighterRedId: null,
          fighterRedSnapshot: PrismaNs.JsonNull,
        },
      });
      return;
    }
    await db(tx).bracketMatch.update({
      where: { id: nextMatchId },
      data: {
        fighterBlueId: null,
        fighterBlueSnapshot: PrismaNs.JsonNull,
      },
    });
  },

  async findUpcomingMatchesForFighter(
    fighterId: string,
    take = 8,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: {
        status: { in: FIELD_MODE_MATCH_STATUSES },
        bracket: {
          event: {
            status: { in: UPCOMING_EVENT_STATUSES },
          },
        },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
      },
      orderBy: [
        { bracket: { event: { eventDate: "asc" } } },
        { globalMatchOrder: "asc" },
        { round: "asc" },
        { matchOrder: "asc" },
      ],
      take,
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: {
              select: {
                id: true,
                title: true,
                publicSlug: true,
                eventDate: true,
                status: true,
              },
            },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: { id: true, fighterId: true },
        },
      },
    });
  },

  async findMatchesForGymInEvent(
    gymId: string,
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: {
        bracket: { eventId },
        status: { not: BracketMatchStatus.cancelled },
        OR: [
          { fighterRed: { currentGymId: gymId } },
          { fighterBlue: { currentGymId: gymId } },
        ],
      },
      orderBy: [
        { globalMatchOrder: "asc" },
        { round: "asc" },
        { matchOrder: "asc" },
      ],
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: { select: { title: true, publicSlug: true } },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        winner: { select: { id: true, name: true } },
        loser: { select: { id: true, name: true } },
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: {
            id: true,
            fighterId: true,
            result: true,
            status: true,
          },
        },
      },
    });
  },

  async findMatchesForFighter(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: {
        status: { not: BracketMatchStatus.cancelled },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
      },
      orderBy: [
        { bracket: { event: { eventDate: "desc" } } },
        { globalMatchOrder: "asc" },
        { round: "asc" },
        { matchOrder: "asc" },
      ],
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: {
              select: {
                id: true,
                title: true,
                publicSlug: true,
                eventDate: true,
                status: true,
              },
            },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        winner: { select: { id: true, name: true } },
        loser: { select: { id: true, name: true } },
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: {
            id: true,
            fighterId: true,
            result: true,
            status: true,
          },
        },
      },
    });
  },

  async findUpcomingMatchesForGym(
    gymId: string,
    take = 16,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: {
        status: { in: FIELD_MODE_MATCH_STATUSES },
        bracket: {
          event: {
            status: { in: UPCOMING_EVENT_STATUSES },
          },
        },
        OR: [
          { fighterRed: { currentGymId: gymId } },
          { fighterBlue: { currentGymId: gymId } },
        ],
      },
      orderBy: [
        { bracket: { event: { eventDate: "asc" } } },
        { globalMatchOrder: "asc" },
        { round: "asc" },
        { matchOrder: "asc" },
      ],
      take,
      include: {
        bracket: {
          select: {
            id: true,
            title: true,
            type: true,
            divisionId: true,
            event: {
              select: {
                id: true,
                title: true,
                publicSlug: true,
                eventDate: true,
                status: true,
              },
            },
            division: {
              select: {
                id: true,
                sportType: true,
                ruleType: true,
                gender: true,
                ageGroup: true,
                weightClass: true,
                skillLevel: true,
              },
            },
          },
        },
        fighterRed: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        fighterBlue: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            profileImageUrl: true,
            currentGymId: true,
            currentGym: { select: { name: true } },
          },
        },
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: { id: true, fighterId: true },
        },
      },
    });
  },

  async countMatchesByCourtForEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const rows = await db(tx).bracketMatch.groupBy({
      by: ["courtId"],
      where: {
        courtId: { not: null },
        bracket: { eventId },
      },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.courtId) {
        map.set(row.courtId, row._count.id);
      }
    }
    return map;
  },
};
