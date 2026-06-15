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
  CheckInStatus,
  EventStatus,
  FighterStatus,
  MatchRecordStatus,
  NextMatchSlot,
  WeighInStatus,
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

export type AutoMatchApplicationRow = {
  id: string;
  fighterId: string;
  divisionId: string;
  gymId: string;
  status: ApplicationStatus;
  checkInStatus: CheckInStatus;
  weighInStatus: WeighInStatus;
  appliedAt: Date | null;
  createdAt: Date;
  fighter: {
    id: string;
    fighterCode: string;
    name: string;
    gender: string | null;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    status: FighterStatus;
  };
  division: {
    id: string;
    sportType: string | null;
    ruleType: string | null;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    skillLevel: string | null;
  };
  gym: { id: string; name: string };
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
            court: { select: { id: true, name: true } },
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
        eventId: true,
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
            courtId: true,
            courtOrder: true,
            status: true,
            fighterRedSnapshot: true,
            fighterBlueSnapshot: true,
            winnerId: true,
            loserId: true,
            resultType: true,
            fighterRedId: true,
            fighterBlueId: true,
            court: { select: { name: true } },
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
    await db(tx).bracketMatch.updateMany({
      where: { bracketId },
      data: { nextMatchId: null },
    });
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
      changedByUserId?: string | null;
      changedByStaffLinkId?: string | null;
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
        changedByUserId: data.changedByUserId ?? null,
        changedByStaffLinkId: data.changedByStaffLinkId ?? null,
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

  async listBracketMatchesForOrder(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: { bracketId },
      select: {
        id: true,
        matchOrder: true,
        globalMatchOrder: true,
        matchNumber: true,
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: { id: true },
        },
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

  async listPlacedFighterIdsForEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const rows = await db(tx).bracketMatch.findMany({
      where: {
        bracket: { eventId },
        status: { not: BracketMatchStatus.cancelled },
        OR: [
          { fighterRedId: { not: null } },
          { fighterBlueId: { not: null } },
        ],
      },
      select: { fighterRedId: true, fighterBlueId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.fighterRedId) ids.add(r.fighterRedId);
      if (r.fighterBlueId) ids.add(r.fighterBlueId);
    }
    return [...ids];
  },

  async countEventMatchesWithOfficialResults(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const matches = await db(tx).bracketMatch.findMany({
      where: { bracket: { eventId } },
      select: {
        id: true,
        matchResults: {
          where: {
            status: {
              in: [
                MatchRecordStatus.confirmed,
                MatchRecordStatus.corrected,
              ],
            },
          },
          select: { id: true },
        },
      },
    });
    return matches.filter((m) => m.matchResults.length >= 2).length;
  },

  async deleteAllEventBracketMatches(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const brackets = await db(tx).bracket.findMany({
      where: { eventId },
      select: { id: true },
    });
    let deleted = 0;
    for (const b of brackets) {
      const count = await db(tx).bracketMatch.count({
        where: { bracketId: b.id },
      });
      if (count > 0) {
        await bracketRepository.deleteBracketMatchesByBracketId(b.id, tx);
        deleted += count;
      }
    }
    return deleted;
  },

  async findMatchListBracketByDivision(
    eventId: string,
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracket.findFirst({
      where: {
        eventId,
        divisionId,
        type: BracketType.match_list,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });
  },

  async getMaxMatchOrderForBracket(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const agg = await db(tx).bracketMatch.aggregate({
      where: { bracketId },
      _max: { matchOrder: true },
    });
    return agg._max.matchOrder ?? -1;
  },

  /**
   * 자동 대진 후보 — 신청 접수·승인 선수(반려/취소 제외), 현장·계체 무관.
   */
  async listApplicantApplicationsForAutoMatch(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AutoMatchApplicationRow[]> {
    const rows = await db(tx).eventApplication.findMany({
      where: {
        eventId,
        status: {
          in: [ApplicationStatus.pending, ApplicationStatus.approved],
        },
        fighter: { status: FighterStatus.active },
      },
      orderBy: [{ gym: { name: "asc" } }, { createdAt: "asc" }],
      select: {
        id: true,
        fighterId: true,
        divisionId: true,
        gymId: true,
        status: true,
        checkInStatus: true,
        weighInStatus: true,
        appliedAt: true,
        createdAt: true,
        fighter: {
          select: {
            id: true,
            fighterCode: true,
            name: true,
            gender: true,
            profileImageUrl: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
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
        gym: { select: { id: true, name: true } },
      },
    });
    return rows as AutoMatchApplicationRow[];
  },

  /** @deprecated listApplicantApplicationsForAutoMatch 사용 */
  async listApprovedApplicationsForAutoMatch(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AutoMatchApplicationRow[]> {
    return bracketRepository.listApplicantApplicationsForAutoMatch(eventId, tx);
  },

  async listFighterBracketMatchesInEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).bracketMatch.findMany({
      where: {
        bracket: { eventId },
        status: { not: BracketMatchStatus.cancelled },
        OR: [
          { fighterRedId: { not: null } },
          { fighterBlueId: { not: null } },
        ],
      },
      select: {
        id: true,
        matchNumber: true,
        globalMatchOrder: true,
        matchOrder: true,
        fighterRedId: true,
        fighterBlueId: true,
        fighterRedSnapshot: true,
        fighterBlueSnapshot: true,
        status: true,
        winnerId: true,
        resultType: true,
        matchResults: {
          where: {
            status: {
              in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
            },
          },
          select: { id: true },
        },
        bracket: {
          select: {
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
          },
        },
      },
      orderBy: [{ globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    });
  },
};
