/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import {
  ApplicationStatus,
  EventStatus,
  MatchRecordStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIST_LIMIT = 400;

export type AdminDashboardStatsRow = {
  totalEvents: number;
  openEvents: number;
  ongoingEvents: number;
  finishedEvents: number;
  totalOrganizers: number;
  totalGyms: number;
  totalFighters: number;
  totalApplications: number;
  approvedApplications: number;
  pendingApplications: number;
  totalMatches: number;
  confirmedResults: number;
  totalMatchResults: number;
};

export const adminRepository = {
  async getAdminDashboardStats(): Promise<AdminDashboardStatsRow> {
    const [
      totalEvents,
      openEvents,
      ongoingEvents,
      finishedEvents,
      totalOrganizers,
      totalGyms,
      totalFighters,
      totalApplications,
      approvedApplications,
      pendingApplications,
      totalMatches,
      confirmedResults,
      totalMatchResults,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: EventStatus.open } }),
      prisma.event.count({ where: { status: EventStatus.ongoing } }),
      prisma.event.count({ where: { status: EventStatus.finished } }),
      prisma.organizer.count(),
      prisma.gym.count(),
      prisma.fighter.count(),
      prisma.eventApplication.count(),
      prisma.eventApplication.count({
        where: { status: ApplicationStatus.approved },
      }),
      prisma.eventApplication.count({
        where: { status: ApplicationStatus.pending },
      }),
      prisma.bracketMatch.count(),
      prisma.matchResult.count({
        where: { status: MatchRecordStatus.confirmed },
      }),
      prisma.matchResult.count(),
    ]);

    return {
      totalEvents,
      openEvents,
      ongoingEvents,
      finishedEvents,
      totalOrganizers,
      totalGyms,
      totalFighters,
      totalApplications,
      approvedApplications,
      pendingApplications,
      totalMatches,
      confirmedResults,
      totalMatchResults,
    };
  },

  async listAdminEvents(limit = DEFAULT_LIST_LIMIT) {
    return prisma.event.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        eventDate: true,
        publicSlug: true,
        organizer: { select: { id: true, name: true } },
        _count: { select: { applications: true, brackets: true } },
      },
    });
  },

  async listAdminOrganizers(limit = DEFAULT_LIST_LIMIT) {
    return prisma.organizer.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        userId: true,
        user: { select: { loginId: true } },
        _count: { select: { events: true } },
      },
    });
  },

  async listAdminGyms(limit = DEFAULT_LIST_LIMIT) {
    return prisma.gym.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        ownerUserId: true,
        ownerUser: { select: { loginId: true } },
        _count: { select: { fighters: true, applications: true } },
      },
    });
  },

  async listAdminFighters(limit = DEFAULT_LIST_LIMIT) {
    return prisma.fighter.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fighterCode: true,
        name: true,
        gender: true,
        recordWin: true,
        recordLoss: true,
        recordDraw: true,
        status: true,
        createdAt: true,
        currentGym: { select: { name: true } },
      },
    });
  },

  async listAdminApplications(limit = DEFAULT_LIST_LIMIT) {
    return prisma.eventApplication.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        event: { select: { id: true, title: true, publicSlug: true } },
        fighter: { select: { id: true, name: true, fighterCode: true } },
        gym: { select: { id: true, name: true } },
      },
    });
  },

  async listAdminMatchResults(limit = DEFAULT_LIST_LIMIT) {
    return prisma.matchResult.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        result: true,
        resultType: true,
        status: true,
        matchDate: true,
        confirmedAt: true,
        createdAt: true,
        event: { select: { id: true, title: true, publicSlug: true } },
        fighter: { select: { id: true, name: true, fighterCode: true } },
        opponentFighter: {
          select: { id: true, name: true, fighterCode: true },
        },
      },
    });
  },

  async listAdminAuditLogs(limit = DEFAULT_LIST_LIMIT) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        actorUserId: true,
        actorUser: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  },
};
