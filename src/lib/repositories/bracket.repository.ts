/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  ApplicationStatus,
  BracketChangeType,
  BracketMatchStatus,
  BracketStatus,
  BracketType,
  EventStatus,
  MatchRecordStatus,
  NextMatchSlot,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const excludedPublicEventStatuses: EventStatus[] = [
  EventStatus.draft,
  EventStatus.cancelled,
];

export type BracketOwnershipContext = {
  bracketId: string;
  eventId: string;
  organizerId: string;
  type: BracketType;
  divisionId: string | null;
};

export type MatchOwnershipContext = {
  matchId: string;
  bracketId: string;
  eventId: string;
  organizerId: string;
};

export type ApprovedApplicationForBracketRow = {
  id: string;
  fighterId: string;
  divisionId: string;
  fighter: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  };
  division: {
    sportType: string | null;
    ruleType: string | null;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    skillLevel: string | null;
  };
  gym: { name: string };
};

export const bracketRepository = {
  async createBracket(
    data: {
      eventId: string;
      divisionId?: string | null;
      title: string;
      type: BracketType;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    return db(tx).bracket.create({
      data: {
        eventId: data.eventId,
        divisionId: data.divisionId ?? null,
        title: data.title,
        type: data.type,
        status: BracketStatus.draft,
        isPublic: false,
      },
      select: { id: true },
    });
  },

  async updateBracket(
    bracketId: string,
    patch: Prisma.BracketUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracket.update({
      where: { id: bracketId },
      data: patch,
    });
  },

  async findBracketById(bracketId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracket.findUnique({
      where: { id: bracketId },
      include: {
        event: { select: { id: true, organizerId: true, title: true } },
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
        _count: { select: { matches: true } },
      },
    });
  },

  async findBracketWithMatches(bracketId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracket.findUnique({
      where: { id: bracketId },
      include: {
        event: { select: { id: true, organizerId: true, title: true } },
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
        matches: {
          orderBy: [{ round: "asc" }, { matchOrder: "asc" }],
          include: {
            fighterRed: {
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
            fighterBlue: {
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
            matchResults: {
              where: {
                status: {
                  in: [
                    MatchRecordStatus.confirmed,
                    MatchRecordStatus.corrected,
                  ],
                },
              },
              select: { id: true, status: true },
            },
          },
        },
      },
    });
  },

  async listBracketsByEvent(eventId: string) {
    return prisma.bracket.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        isPublic: true,
        divisionId: true,
        division: {
          select: {
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
        _count: { select: { matches: true } },
      },
    });
  },

  async listPublicBracketsByEventSlug(slug: string) {
    const event = await prisma.event.findFirst({
      where: {
        publicSlug: slug,
        status: { notIn: excludedPublicEventStatuses },
      },
      select: { id: true },
    });
    if (!event) return [];

    return prisma.bracket.findMany({
      where: {
        eventId: event.id,
        isPublic: true,
        status: {
          in: [
            BracketStatus.published,
            BracketStatus.ongoing,
            BracketStatus.finished,
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        division: {
          select: {
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
        matches: {
          orderBy: [{ round: "asc" }, { matchOrder: "asc" }],
          select: {
            id: true,
            round: true,
            roundName: true,
            matchOrder: true,
            globalMatchOrder: true,
            matchNumber: true,
            matNumber: true,
            status: true,
            fighterRedSnapshot: true,
            fighterBlueSnapshot: true,
            winnerId: true,
            loserId: true,
            resultType: true,
            fighterRedId: true,
            fighterBlueId: true,
          },
        },
      },
    });
  },

  async createBracketMatch(
    data: {
      bracketId: string;
      round?: number | null;
      roundName?: string | null;
      matchOrder: number;
      globalMatchOrder?: number | null;
      matchNumber?: number | null;
      matNumber?: number | null;
      fighterRedId?: string | null;
      fighterBlueId?: string | null;
      fighterRedSnapshot?: Prisma.InputJsonValue | null;
      fighterBlueSnapshot?: Prisma.InputJsonValue | null;
      nextMatchId?: string | null;
      nextMatchSlot?: NextMatchSlot | null;
      status?: BracketMatchStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    return db(tx).bracketMatch.create({
      data: {
        bracketId: data.bracketId,
        round: data.round ?? null,
        roundName: data.roundName ?? null,
        matchOrder: data.matchOrder,
        globalMatchOrder: data.globalMatchOrder ?? null,
        matchNumber: data.matchNumber ?? null,
        matNumber: data.matNumber ?? null,
        fighterRedId: data.fighterRedId ?? null,
        fighterBlueId: data.fighterBlueId ?? null,
        fighterRedSnapshot: data.fighterRedSnapshot ?? undefined,
        fighterBlueSnapshot: data.fighterBlueSnapshot ?? undefined,
        nextMatchId: data.nextMatchId ?? null,
        nextMatchSlot: data.nextMatchSlot ?? null,
        status: data.status ?? BracketMatchStatus.waiting,
      },
      select: { id: true },
    });
  },

  async createManyBracketMatches(
    rows: Prisma.BracketMatchCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (rows.length === 0) return;
    await db(tx).bracketMatch.createMany({ data: rows });
  },

  async updateBracketMatch(
    matchId: string,
    patch: Prisma.BracketMatchUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.update({
      where: { id: matchId },
      data: patch,
    });
  },

  async deleteBracketMatchesByBracketId(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketMatch.deleteMany({ where: { bracketId } });
  },

  async countMatchesByBracketId(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).bracketMatch.count({ where: { bracketId } });
  },

  async createBracketChangeLog(
    data: {
      eventId: string;
      bracketId: string;
      matchId?: string | null;
      changedByUserId: string;
      bracketType: BracketType;
      changeType: BracketChangeType;
      beforeData?: Prisma.InputJsonValue | null;
      afterData?: Prisma.InputJsonValue | null;
      reason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).bracketChangeLog.create({
      data: {
        eventId: data.eventId,
        bracketId: data.bracketId,
        matchId: data.matchId ?? null,
        changedByUserId: data.changedByUserId,
        bracketType: data.bracketType,
        changeType: data.changeType,
        beforeData: data.beforeData ?? undefined,
        afterData: data.afterData ?? undefined,
        reason: data.reason ?? null,
      },
    });
  },

  async findApprovedApplicationForBracketPlacement(
    eventId: string,
    fighterId: string,
    bracketDivisionId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<ApprovedApplicationForBracketRow | null> {
    const row = await db(tx).eventApplication.findFirst({
      where: {
        eventId,
        fighterId,
        status: ApplicationStatus.approved,
        ...(bracketDivisionId ? { divisionId: bracketDivisionId } : {}),
      },
      select: {
        id: true,
        fighterId: true,
        divisionId: true,
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
        division: {
          select: {
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
        gym: { select: { name: true } },
      },
    });
    return row ? (row as ApprovedApplicationForBracketRow) : null;
  },

  async listApprovedApplicationsForBracket(
    eventId: string,
    divisionId?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<ApprovedApplicationForBracketRow[]> {
    const rows = await db(tx).eventApplication.findMany({
      where: {
        eventId,
        status: ApplicationStatus.approved,
        ...(divisionId ? { divisionId } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fighterId: true,
        divisionId: true,
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
        division: {
          select: {
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
        gym: { select: { name: true } },
      },
    });
    return rows as ApprovedApplicationForBracketRow[];
  },

  async findBracketOwnershipContext(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BracketOwnershipContext | null> {
    const row = await db(tx).bracket.findUnique({
      where: { id: bracketId },
      select: {
        id: true,
        eventId: true,
        divisionId: true,
        type: true,
        event: { select: { organizerId: true } },
      },
    });
    if (!row?.event?.organizerId) return null;
    return {
      bracketId: row.id,
      eventId: row.eventId,
      organizerId: row.event.organizerId,
      type: row.type,
      divisionId: row.divisionId,
    };
  },

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

  async countFighterAssignmentsInBracket(
    bracketId: string,
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).bracketMatch.count({
      where: {
        bracketId,
        status: { not: BracketMatchStatus.cancelled },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
      },
    });
  },

  async countFighterAssignmentsInBracketExcluding(
    bracketId: string,
    fighterId: string,
    excludeMatchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).bracketMatch.count({
      where: {
        bracketId,
        id: { not: excludeMatchId },
        status: { not: BracketMatchStatus.cancelled },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
      },
    });
  },

  async findBracketMatchById(matchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      include: {
        bracket: {
          select: {
            id: true,
            eventId: true,
            divisionId: true,
            type: true,
          },
        },
      },
    });
  },

  async findMatchAdvancementLinks(
    matchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    nextMatchId: string | null;
    nextMatchSlot: NextMatchSlot | null;
  } | null> {
    const row = await db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      select: { nextMatchId: true, nextMatchSlot: true },
    });
    return row;
  },
};
