import "server-only";

import type { Prisma } from "@/generated/prisma";
import type {
  GymGroupClassParticipationStatus,
  GymGroupClassStatus,
} from "@/lib/enums";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type GymGroupClassListFilters = {
  gymId: string;
  rangeStart: Date;
  rangeEndExclusive: Date;
  instructorStaffId?: string | null;
  status?: GymGroupClassStatus | null;
  titleQuery?: string | null;
};

const classInclude = {
  instructorStaff: {
    select: { id: true, name: true, title: true, isActive: true, deletedAt: true },
  },
  participations: {
    where: { status: { in: ["attending", "waitlisted"] as GymGroupClassParticipationStatus[] } },
    select: {
      id: true,
      status: true,
      waitlistOrder: true,
      gymMemberId: true,
    },
  },
  _count: {
    select: {
      participations: {
        where: { status: "attending" },
      },
    },
  },
} as const;

export type GymGroupClassRow = Awaited<
  ReturnType<typeof gymGroupClassRepository.findById>
>;

export const gymGroupClassRepository = {
  async listInRange(filters: GymGroupClassListFilters) {
    return prisma.gymGroupClass.findMany({
      where: {
        gymId: filters.gymId,
        deletedAt: null,
        startsAt: { gte: filters.rangeStart, lt: filters.rangeEndExclusive },
        ...(filters.instructorStaffId
          ? { instructorStaffId: filters.instructorStaffId }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.titleQuery
          ? { title: { contains: filters.titleQuery, mode: "insensitive" } }
          : {}),
      },
      include: classInclude,
      orderBy: { startsAt: "asc" },
    });
  },

  async findById(id: string, gymId: string) {
    return prisma.gymGroupClass.findFirst({
      where: { id, gymId, deletedAt: null },
      include: {
        ...classInclude,
        participations: {
          include: {
            gymMember: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                profileImagePath: true,
                memberNumber: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { waitlistOrder: "asc" }, { respondedAt: "asc" }],
        },
      },
    });
  },

  async listStaffOverlapping(input: {
    gymId: string;
    instructorStaffId: string;
    startsAt: Date;
    endsAt: Date;
    excludeId?: string;
  }) {
    return prisma.gymGroupClass.findMany({
      where: {
        gymId: input.gymId,
        instructorStaffId: input.instructorStaffId,
        deletedAt: null,
        status: { not: "cancelled" },
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: { id: true, startsAt: true, endsAt: true, title: true },
    });
  },

  async listMemberAttendingOverlapping(input: {
    gymId: string;
    gymMemberId: string;
    startsAt: Date;
    endsAt: Date;
    excludeClassId?: string;
  }) {
    return prisma.gymGroupClassParticipation.findMany({
      where: {
        gymId: input.gymId,
        gymMemberId: input.gymMemberId,
        status: "attending",
        ...(input.excludeClassId
          ? { gymGroupClassId: { not: input.excludeClassId } }
          : {}),
        gymGroupClass: {
          deletedAt: null,
          status: { not: "cancelled" },
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
        },
      },
      select: {
        id: true,
        gymGroupClassId: true,
        gymGroupClass: {
          select: { id: true, title: true, startsAt: true, endsAt: true },
        },
      },
    });
  },

  async countAttending(tx: Tx, gymGroupClassId: string) {
    return tx.gymGroupClassParticipation.count({
      where: { gymGroupClassId, status: "attending" },
    });
  },

  async nextWaitlistOrder(tx: Tx, gymGroupClassId: string) {
    const max = await tx.gymGroupClassParticipation.aggregate({
      where: { gymGroupClassId, status: "waitlisted" },
      _max: { waitlistOrder: true },
    });
    return (max._max.waitlistOrder ?? 0) + 1;
  },

  async findEarliestWaitlisted(tx: Tx, gymGroupClassId: string) {
    return tx.gymGroupClassParticipation.findFirst({
      where: { gymGroupClassId, status: "waitlisted" },
      orderBy: [{ waitlistOrder: "asc" }, { respondedAt: "asc" }],
    });
  },
};
