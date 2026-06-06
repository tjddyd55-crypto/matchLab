/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import {
  ApplicationStatus,
  FighterStatus,
  GymStatus,
  type Prisma,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const ACTIVE_HISTORY = {
  status: "active",
  endDate: null,
} as const;

export type PublicFighterListFilters = {
  q?: string;
  region?: string;
  gymId?: string;
  gender?: string;
  ageGroup?: string;
  weightClass?: string;
  sportType?: string;
  hasRecentEvent?: boolean;
};

export const publicFighterRepository = {
  async findActiveHistoryForGymFighter(fighterId: string, gymId: string) {
    return prisma.fighterGymHistory.findFirst({
      where: {
        fighterId,
        gymId,
        ...ACTIVE_HISTORY,
      },
    });
  },

  async setPublicFlagForActiveHistory(input: {
    historyId: string;
    isPublic: boolean;
    publicMemo?: string | null;
  }) {
    const now = new Date();
    return prisma.fighterGymHistory.update({
      where: { id: input.historyId },
      data: {
        isPublicToOrganizers: input.isPublic,
        publicEnabledAt: input.isPublic ? now : undefined,
        publicDisabledAt: input.isPublic ? null : now,
        publicMemo: input.publicMemo?.trim() || null,
      },
    });
  },

  async listPublicSettingsByGym(gymId: string) {
    return prisma.fighterGymHistory.findMany({
      where: {
        gymId,
        ...ACTIVE_HISTORY,
        fighter: { status: FighterStatus.active },
      },
      select: {
        id: true,
        fighterId: true,
        isPublicToOrganizers: true,
        publicEnabledAt: true,
        publicMemo: true,
      },
    });
  },

  async listPublicFightersForOrganizer(): Promise<
    Prisma.FighterGymHistoryGetPayload<{
      include: {
        fighter: {
          select: {
            id: true;
            name: true;
            gender: true;
            birthDate: true;
            weight: true;
            recordWin: true;
            recordLoss: true;
            recordDraw: true;
            profileImageUrl: true;
            currentGymId: true;
            fighterProfile: {
              select: {
                isPublic: true;
                slug: true;
                profileImageUrl: true;
                displayName: true;
              };
            };
          };
        };
        gym: {
          select: {
            id: true;
            name: true;
            phone: true;
            address: true;
            status: true;
          };
        };
      };
    }>[]
  > {
    const histories = await prisma.fighterGymHistory.findMany({
      where: {
        isPublicToOrganizers: true,
        ...ACTIVE_HISTORY,
        gym: { status: GymStatus.active },
        fighter: {
          status: FighterStatus.active,
          currentGymId: { not: null },
        },
      },
      include: {
        fighter: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            weight: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
            profileImageUrl: true,
            currentGymId: true,
            fighterProfile: {
              select: {
                isPublic: true,
                slug: true,
                profileImageUrl: true,
                displayName: true,
              },
            },
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            status: true,
          },
        },
      },
      orderBy: [{ publicEnabledAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return histories.filter((h) => h.fighter.currentGymId === h.gymId);
  },

  async findPublicFighterDetail(fighterId: string) {
    const history = await prisma.fighterGymHistory.findFirst({
      where: {
        fighterId,
        isPublicToOrganizers: true,
        ...ACTIVE_HISTORY,
        gym: { status: GymStatus.active },
        fighter: {
          status: FighterStatus.active,
          currentGymId: { not: null },
        },
      },
      include: {
        fighter: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            weight: true,
            height: true,
            recordWin: true,
            recordLoss: true,
            recordDraw: true,
            profileImageUrl: true,
            currentGymId: true,
            fighterProfile: {
              select: {
                isPublic: true,
                slug: true,
                profileImageUrl: true,
                displayName: true,
              },
            },
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!history || history.fighter.currentGymId !== history.gymId) {
      return null;
    }

    const recentApplications = await prisma.eventApplication.findMany({
      where: {
        fighterId,
        gymId: history.gymId,
        status: ApplicationStatus.approved,
      },
      orderBy: { appliedAt: "desc" },
      take: 8,
      select: {
        appliedAt: true,
        event: { select: { title: true, eventDate: true } },
        division: {
          select: {
            sportType: true,
            weightClass: true,
            ageGroup: true,
          },
        },
      },
    });

    return { history, recentApplications };
  },

  async listLatestApprovedApplicationByFighters(fighterIds: string[]) {
    if (fighterIds.length === 0) return new Map<string, { eventTitle: string; sportType: string }>();

    const rows = await prisma.eventApplication.findMany({
      where: {
        fighterId: { in: fighterIds },
        status: ApplicationStatus.approved,
      },
      orderBy: { appliedAt: "desc" },
      select: {
        fighterId: true,
        event: { select: { title: true } },
        division: { select: { sportType: true } },
      },
    });

    const map = new Map<string, { eventTitle: string; sportType: string }>();
    for (const r of rows) {
      if (!map.has(r.fighterId)) {
        map.set(r.fighterId, {
          eventTitle: r.event.title,
          sportType: r.division.sportType,
        });
      }
    }
    return map;
  },

  async listFilterOptions() {
    const gyms = await prisma.gym.findMany({
      where: { status: GymStatus.active },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
      take: 300,
    });
    return { gyms };
  },
};
