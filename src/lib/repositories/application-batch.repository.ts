/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { EventApplicationBatchStatus, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const applicationBatchRepository = {
  async findDraftForGymEvent(
    eventId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplicationBatch.findFirst({
      where: {
        eventId,
        gymId,
        status: "draft",
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
        documents: {
          include: {
            fighter: { select: { id: true, name: true, fighterCode: true } },
            athleteConsent: { select: { id: true, status: true, token: true } },
            guardianConsent: {
              select: { id: true, consentStatus: true },
            },
          },
        },
      },
    });
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventApplicationBatch.findUnique({
      where: { id },
      include: {
        template: true,
        gym: { select: { id: true, name: true } },
        event: {
          select: { id: true, title: true, organizerId: true, eventDate: true },
        },
        documents: {
          include: {
            fighter: {
              select: {
                id: true,
                name: true,
                fighterCode: true,
                birthDate: true,
                gender: true,
                weight: true,
                recordWin: true,
                recordLoss: true,
                recordDraw: true,
                schoolName: true,
                grade: true,
                guardianName: true,
                guardianPhone: true,
              },
            },
            athleteConsent: {
              select: { id: true, status: true, signedAt: true, token: true },
            },
            guardianConsent: {
              select: { id: true, consentStatus: true, signedAt: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  async listForEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplicationBatch.findMany({
      where: { eventId, status: { not: "draft" } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      include: {
        gym: { select: { id: true, name: true } },
        template: { select: { id: true, title: true, originalPdfFileName: true } },
        _count: { select: { documents: true } },
      },
    });
  },

  async create(
    data: {
      eventId: string;
      gymId: string;
      applicationFormTemplateId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplicationBatch.create({
      data: {
        eventId: data.eventId,
        gymId: data.gymId,
        applicationFormTemplateId: data.applicationFormTemplateId,
        status: "draft",
      },
    });
  },

  async updateStatus(
    id: string,
    data: {
      status: EventApplicationBatchStatus;
      documentNo?: string | null;
      submittedByUserId?: string | null;
      submittedAt?: Date | null;
      totalFighterCount?: number;
      organizerFeePerFighter?: number | null;
      organizerTotalFee?: number | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplicationBatch.update({
      where: { id },
      data,
    });
  },
};
