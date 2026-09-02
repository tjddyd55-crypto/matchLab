import "server-only";

import type { Prisma } from "@/generated/prisma";
import type {
  AssociationScheduleType,
  AssociationScheduleVisibility,
} from "@/lib/enums";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const associationScheduleRepository = {
  async listInRange(
    organizerId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    return prisma.associationSchedule.findMany({
      where: {
        organizerId,
        deletedAt: null,
        startsAt: { lte: rangeEnd },
        OR: [{ endsAt: null }, { endsAt: { gte: rangeStart } }],
      },
      orderBy: [{ startsAt: "asc" }, { title: "asc" }],
      include: {
        relatedForm: { select: { id: true, title: true, publicToken: true } },
        relatedNotice: { select: { id: true, title: true } },
      },
    });
  },

  async findByIdForOrganizer(organizerId: string, scheduleId: string) {
    return prisma.associationSchedule.findFirst({
      where: { id: scheduleId, organizerId, deletedAt: null },
      include: {
        relatedForm: { select: { id: true, title: true, publicToken: true } },
        relatedNotice: { select: { id: true, title: true } },
      },
    });
  },

  async create(data: Prisma.AssociationScheduleCreateInput) {
    return prisma.associationSchedule.create({ data });
  },

  async update(
    scheduleId: string,
    data: Prisma.AssociationScheduleUpdateInput,
  ) {
    return prisma.associationSchedule.update({
      where: { id: scheduleId },
      data,
    });
  },

  async softDelete(scheduleId: string) {
    return prisma.associationSchedule.update({
      where: { id: scheduleId },
      data: { deletedAt: new Date() },
    });
  },

  async listNoticeOptions(organizerId: string) {
    return prisma.associationNotice.findMany({
      where: { organizerId, deletedAt: null },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      select: { id: true, title: true },
    });
  },
};

export type AssociationScheduleListRow = {
  id: string;
  title: string;
  type: AssociationScheduleType;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
  visibility: AssociationScheduleVisibility;
};
