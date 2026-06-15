import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const db = (tx?: Prisma.TransactionClient) => tx ?? prisma;

const divisionRuleInclude = {
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
} as const;

export const eventCourtRepository = {
  async listByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventCourt.findMany({
      where: { eventId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        divisionRules: {
          where: { isActive: true },
          include: divisionRuleInclude,
          orderBy: { priority: "asc" },
        },
      },
    });
  },

  async listAllByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventCourt.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        divisionRules: {
          where: { isActive: true },
          include: divisionRuleInclude,
          orderBy: { priority: "asc" },
        },
      },
    });
  },

  async listActiveRulesByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventCourtDivisionRule.findMany({
      where: { eventId, isActive: true },
      orderBy: { priority: "asc" },
    });
  },

  async findById(courtId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventCourt.findUnique({
      where: { id: courtId },
    });
  },

  async create(
    data: Prisma.EventCourtCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourt.create({ data });
  },

  async update(
    courtId: string,
    data: Prisma.EventCourtUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourt.update({ where: { id: courtId }, data });
  },

  async reorderCourts(
    eventId: string,
    orderedCourtIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (let i = 0; i < orderedCourtIds.length; i += 1) {
      await db(tx).eventCourt.updateMany({
        where: { id: orderedCourtIds[i], eventId },
        data: { sortOrder: i },
      });
    }
  },

  async findDuplicateName(
    eventId: string,
    name: string,
    excludeCourtId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourt.findFirst({
      where: {
        eventId,
        name,
        isActive: true,
        ...(excludeCourtId ? { id: { not: excludeCourtId } } : {}),
      },
      select: { id: true },
    });
  },

  async createDivisionRule(
    data: {
      eventId: string;
      courtId: string;
      divisionId?: string | null;
      weightClassLabel?: string | null;
      priority?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const divisionId = data.divisionId ?? null;
    const weightClassLabel = data.weightClassLabel?.trim() || null;

    const existing = await db(tx).eventCourtDivisionRule.findFirst({
      where: {
        courtId: data.courtId,
        divisionId,
        weightClassLabel,
        isActive: true,
      },
    });
    if (existing) return existing;

    return db(tx).eventCourtDivisionRule.create({
      data: {
        eventId: data.eventId,
        courtId: data.courtId,
        divisionId,
        weightClassLabel,
        priority: data.priority ?? 0,
        isActive: true,
      },
    });
  },

  async deactivateDivisionRule(
    ruleId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourtDivisionRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  },
};
