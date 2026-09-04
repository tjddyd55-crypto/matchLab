import "server-only";

import type { Prisma } from "@/generated/prisma";
import type {
  AssociationScheduleType,
  AssociationScheduleVisibility,
} from "@/lib/enums";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
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
        relatedEvent: { select: { id: true, title: true } },
      },
    });
  },

  async findByIdForOrganizer(organizerId: string, scheduleId: string) {
    return prisma.associationSchedule.findFirst({
      where: { id: scheduleId, organizerId, deletedAt: null },
      include: {
        relatedForm: { select: { id: true, title: true, publicToken: true } },
        relatedNotice: { select: { id: true, title: true } },
        relatedEvent: { select: { id: true, title: true } },
      },
    });
  },

  async findActiveByRelatedEventId(organizerId: string, eventId: string) {
    return prisma.associationSchedule.findFirst({
      where: {
        organizerId,
        relatedEventId: eventId,
        deletedAt: null,
      },
      select: { id: true, startsAt: true },
    });
  },

  async mapActiveRelatedEventIds(organizerId: string, eventIds: string[]) {
    if (eventIds.length === 0) {
      return {} as Record<string, { scheduleId: string; dateKey: string }>;
    }
    const rows = await prisma.associationSchedule.findMany({
      where: {
        organizerId,
        deletedAt: null,
        relatedEventId: { in: eventIds },
      },
      select: { id: true, relatedEventId: true, startsAt: true },
    });
    const map: Record<string, { scheduleId: string; dateKey: string }> = {};
    for (const row of rows) {
      if (row.relatedEventId) {
        map[row.relatedEventId] = {
          scheduleId: row.id,
          dateKey: toSeoulDateOnlyString(row.startsAt),
        };
      }
    }
    return map;
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
