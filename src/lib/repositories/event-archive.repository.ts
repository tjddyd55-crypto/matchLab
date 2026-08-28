import type { Prisma } from "@/generated/prisma";
import { EventArchiveStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type CreateEventArchiveInput = {
  eventId: string;
  version: number;
  eventSnapshot: Prisma.InputJsonValue;
  applicantsSnapshot: Prisma.InputJsonValue;
  bracketSnapshot: Prisma.InputJsonValue;
  resultsSnapshot: Prisma.InputJsonValue;
  archivedByUserId: string | null;
};

export const eventArchiveRepository = {
  async findActiveByEventId(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventArchive.findFirst({
      where: { eventId, status: EventArchiveStatus.active },
      orderBy: { version: "desc" },
    });
  },

  async findByEventAndVersion(
    eventId: string,
    version: number,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventArchive.findUnique({
      where: { eventId_version: { eventId, version } },
    });
  },

  async create(input: CreateEventArchiveInput, tx?: Prisma.TransactionClient) {
    return db(tx).eventArchive.create({
      data: {
        eventId: input.eventId,
        version: input.version,
        status: EventArchiveStatus.active,
        eventSnapshot: input.eventSnapshot,
        applicantsSnapshot: input.applicantsSnapshot,
        bracketSnapshot: input.bracketSnapshot,
        resultsSnapshot: input.resultsSnapshot,
        archivedByUserId: input.archivedByUserId,
      },
    });
  },

  async listActiveArchiveEventIds(eventIds: string[], tx?: Prisma.TransactionClient) {
    if (eventIds.length === 0) return new Set<string>();
    const rows = await db(tx).eventArchive.findMany({
      where: {
        eventId: { in: eventIds },
        status: EventArchiveStatus.active,
      },
      select: { eventId: true },
    });
    return new Set(rows.map((r) => r.eventId));
  },
};
