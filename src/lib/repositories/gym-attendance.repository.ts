/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  GymMemberAttendanceSource,
  type GymAttendanceKioskDuplicatePolicy,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const gymAttendanceRepository = {
  async findKioskByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymAttendanceKiosk.findUnique({
      where: { publicTokenHash: tokenHash },
      include: {
        gym: { select: { id: true, name: true, status: true } },
      },
    });
  },

  async listKiosks(gymId: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymAttendanceKiosk.findMany({
      where: { gymId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  },

  async findKioskForGym(
    id: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymAttendanceKiosk.findFirst({
      where: { id, gymId },
    });
  },

  async createKiosk(
    data: {
      gymId: string;
      name: string;
      publicTokenHash: string;
      allowExpiredMember?: boolean;
      allowPausedMember?: boolean;
      duplicatePolicy?: GymAttendanceKioskDuplicatePolicy;
      createdByUserId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymAttendanceKiosk.create({ data });
  },

  async updateKiosk(
    id: string,
    data: Prisma.GymAttendanceKioskUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymAttendanceKiosk.update({ where: { id }, data });
  },

  async touchKioskLastUsed(id: string, at: Date, tx?: Prisma.TransactionClient) {
    return db(tx).gymAttendanceKiosk.update({
      where: { id },
      data: { lastUsedAt: at },
    });
  },

  async findActiveMembersByPhone(
    gymId: string,
    normalizedPhone: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMember.findMany({
      where: {
        gymId,
        normalizedPhone,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true,
        normalizedPhone: true,
        subscriptions: {
          where: { status: { in: ["active", "paused"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { endsAt: true, status: true },
        },
      },
    });
  },

  async findAttendanceByMemberDate(
    gymId: string,
    gymMemberId: string,
    attendanceDate: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.findUnique({
      where: {
        gymId_gymMemberId_attendanceDate: {
          gymId,
          gymMemberId,
          attendanceDate,
        },
      },
    });
  },

  async createAttendance(
    data: {
      gymId: string;
      gymMemberId: string;
      attendedAt: Date;
      attendanceDate: Date;
      source: GymMemberAttendanceSource;
      kioskSessionId?: string | null;
      createdByUserId?: string | null;
      note?: string | null;
      membershipStatusSnapshot?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.create({ data });
  },

  async restoreAttendance(
    id: string,
    data: {
      attendedAt: Date;
      source: GymMemberAttendanceSource;
      kioskSessionId?: string | null;
      createdByUserId?: string | null;
      note?: string | null;
      membershipStatusSnapshot?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.update({
      where: { id },
      data: {
        ...data,
        deletedAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
      },
    });
  },

  async softCancelAttendance(
    id: string,
    data: {
      cancelledByUserId: string;
      cancellationReason?: string | null;
      deletedAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.update({
      where: { id },
      data,
    });
  },

  async findAttendanceForGym(
    id: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.findFirst({
      where: { id, gymId },
      include: {
        gymMember: {
          select: {
            id: true,
            name: true,
            phone: true,
            normalizedPhone: true,
            status: true,
          },
        },
      },
    });
  },

  async listAttendances(
    input: {
      gymId: string;
      dateFrom?: Date;
      dateToExclusive?: Date;
      memberNameQ?: string;
      phoneTail?: string;
      memberStatus?: string;
      source?: GymMemberAttendanceSource;
      includeDeleted?: boolean;
      skip: number;
      take: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.GymMemberAttendanceWhereInput = {
      gymId: input.gymId,
      ...(input.includeDeleted ? {} : { deletedAt: null }),
      ...(input.dateFrom || input.dateToExclusive
        ? {
            attendanceDate: {
              ...(input.dateFrom ? { gte: input.dateFrom } : {}),
              ...(input.dateToExclusive ? { lt: input.dateToExclusive } : {}),
            },
          }
        : {}),
      ...(input.source ? { source: input.source } : {}),
      gymMember: {
        ...(input.memberNameQ
          ? { name: { contains: input.memberNameQ, mode: "insensitive" } }
          : {}),
        ...(input.phoneTail
          ? { normalizedPhone: { endsWith: input.phoneTail } }
          : {}),
        ...(input.memberStatus ? { status: input.memberStatus as never } : {}),
      },
    };

    const [rows, total] = await Promise.all([
      db(tx).gymMemberAttendance.findMany({
        where,
        orderBy: [{ attendedAt: "desc" }],
        skip: input.skip,
        take: input.take,
        include: {
          gymMember: {
            select: {
              id: true,
              name: true,
              phone: true,
              normalizedPhone: true,
              status: true,
              profileImagePath: true,
              subscriptions: {
                where: { status: { in: ["active", "paused"] } },
                orderBy: { startedAt: "desc" },
                take: 1,
                select: { endsAt: true, status: true, planNameSnapshot: true },
              },
            },
          },
        },
      }),
      db(tx).gymMemberAttendance.count({ where }),
    ]);

    return { rows, total };
  },

  async countAttendances(
    gymId: string,
    dateFrom: Date,
    dateToExclusive: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.count({
      where: {
        gymId,
        deletedAt: null,
        attendanceDate: { gte: dateFrom, lt: dateToExclusive },
      },
    });
  },

  async countDistinctMembersToday(
    gymId: string,
    attendanceDate: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const groups = await db(tx).gymMemberAttendance.groupBy({
      by: ["gymMemberId"],
      where: {
        gymId,
        deletedAt: null,
        attendanceDate,
      },
    });
    return groups.length;
  },

  async countDeskNoticeToday(
    gymId: string,
    attendanceDate: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.count({
      where: {
        gymId,
        deletedAt: null,
        attendanceDate,
        membershipStatusSnapshot: { in: ["expired", "paused", "no_plan"] },
      },
    });
  },

  async listMemberCalendar(
    input: {
      gymId: string;
      gymMemberId: string;
      rangeStart: Date;
      rangeEndExclusive: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.findMany({
      where: {
        gymId: input.gymId,
        gymMemberId: input.gymMemberId,
        deletedAt: null,
        attendanceDate: {
          gte: input.rangeStart,
          lt: input.rangeEndExclusive,
        },
      },
      orderBy: { attendanceDate: "asc" },
    });
  },

  async countMemberAttendances(
    gymId: string,
    gymMemberId: string,
    dateFrom?: Date,
    dateToExclusive?: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.count({
      where: {
        gymId,
        gymMemberId,
        deletedAt: null,
        ...(dateFrom || dateToExclusive
          ? {
              attendanceDate: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateToExclusive ? { lt: dateToExclusive } : {}),
              },
            }
          : {}),
      },
    });
  },

  async findLatestMemberAttendance(
    gymId: string,
    gymMemberId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberAttendance.findFirst({
      where: { gymId, gymMemberId, deletedAt: null },
      orderBy: { attendedAt: "desc" },
    });
  },

  async findMemberForGym(
    gymMemberId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMember.findFirst({
      where: { id: gymMemberId, gymId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true,
        subscriptions: {
          where: { status: { in: ["active", "paused"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { endsAt: true, status: true },
        },
      },
    });
  },
};

export { GymMemberAttendanceSource };
