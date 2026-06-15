import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const db = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const eventCourtRepository = {
  async listByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventCourt.findMany({
      where: { eventId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        divisionRules: {
          where: { isActive: true },
          include: {
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
          },
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
          include: {
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
          },
          orderBy: { priority: "asc" },
        },
      },
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

  async upsertDivisionRule(
    data: {
      eventId: string;
      courtId: string;
      divisionId: string;
      priority?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourtDivisionRule.upsert({
      where: {
        courtId_divisionId: {
          courtId: data.courtId,
          divisionId: data.divisionId,
        },
      },
      create: {
        eventId: data.eventId,
        courtId: data.courtId,
        divisionId: data.divisionId,
        priority: data.priority ?? 0,
        isActive: true,
      },
      update: {
        isActive: true,
        priority: data.priority ?? 0,
      },
    });
  },

  async deactivateDivisionRule(
    courtId: string,
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventCourtDivisionRule.updateMany({
      where: { courtId, divisionId },
      data: { isActive: false },
    });
  },
};
