import "server-only";

import type {
  GymPersonalScheduleStatus,
  GymPersonalScheduleType,
  Prisma,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const scheduleInclude = {
  gymStaff: {
    select: {
      id: true,
      name: true,
      title: true,
      colorKey: true,
      staffRole: true,
    },
  },
  gymMember: {
    select: {
      id: true,
      name: true,
      memberNumber: true,
      phone: true,
      status: true,
      profileImagePath: true,
    },
  },
} satisfies Prisma.GymPersonalScheduleInclude;

export type GymScheduleRow = Prisma.GymPersonalScheduleGetPayload<{
  include: typeof scheduleInclude;
}>;

export type GymScheduleListFilter = {
  gymId: string;
  rangeStart: Date;
  rangeEndExclusive: Date;
  gymStaffId?: string | null;
  gymMemberId?: string | null;
  statuses?: GymPersonalScheduleStatus[] | null;
  includeDeleted?: boolean;
};

function activeWhere(gymId: string): Prisma.GymPersonalScheduleWhereInput {
  return { gymId, deletedAt: null };
}

export const gymScheduleRepository = {
  async findById(id: string, gymId: string): Promise<GymScheduleRow | null> {
    return prisma.gymPersonalSchedule.findFirst({
      where: { id, ...activeWhere(gymId) },
      include: scheduleInclude,
    });
  },

  async listInRange(filter: GymScheduleListFilter): Promise<GymScheduleRow[]> {
    const statusFilter =
      filter.statuses && filter.statuses.length > 0
        ? { status: { in: filter.statuses } }
        : {};
    return prisma.gymPersonalSchedule.findMany({
      where: {
        gymId: filter.gymId,
        deletedAt: filter.includeDeleted ? undefined : null,
        startsAt: { lt: filter.rangeEndExclusive },
        endsAt: { gt: filter.rangeStart },
        ...(filter.gymStaffId ? { gymStaffId: filter.gymStaffId } : {}),
        ...(filter.gymMemberId ? { gymMemberId: filter.gymMemberId } : {}),
        ...statusFilter,
      },
      include: scheduleInclude,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });
  },

  async listOverlapping(input: {
    gymId: string;
    gymStaffId: string;
    gymMemberId: string;
    startsAt: Date;
    endsAt: Date;
    excludeId?: string;
  }): Promise<
    Array<{
      id: string;
      gymStaffId: string;
      gymMemberId: string;
      startsAt: Date;
      endsAt: Date;
      status: GymPersonalScheduleStatus;
    }>
  > {
    return prisma.gymPersonalSchedule.findMany({
      where: {
        gymId: input.gymId,
        deletedAt: null,
        status: { not: "cancelled" },
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
        OR: [
          { gymStaffId: input.gymStaffId },
          { gymMemberId: input.gymMemberId },
        ],
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: {
        id: true,
        gymStaffId: true,
        gymMemberId: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
    });
  },

  async create(
    data: Prisma.GymPersonalScheduleCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.gymPersonalSchedule.create({
      data,
      include: scheduleInclude,
    });
  },

  async update(
    id: string,
    data: Prisma.GymPersonalScheduleUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.gymPersonalSchedule.update({
      where: { id },
      data,
      include: scheduleInclude,
    });
  },

  async countByStatus(input: {
    gymId: string;
    rangeStart: Date;
    rangeEndExclusive: Date;
    gymStaffId?: string | null;
  }): Promise<Record<GymPersonalScheduleStatus, number>> {
    const groups = await prisma.gymPersonalSchedule.groupBy({
      by: ["status"],
      where: {
        gymId: input.gymId,
        deletedAt: null,
        startsAt: { lt: input.rangeEndExclusive },
        endsAt: { gt: input.rangeStart },
        ...(input.gymStaffId ? { gymStaffId: input.gymStaffId } : {}),
      },
      _count: { _all: true },
    });
    const base: Record<GymPersonalScheduleStatus, number> = {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const g of groups) {
      base[g.status] = g._count._all;
    }
    return base;
  },
};

export type { GymPersonalScheduleType };
