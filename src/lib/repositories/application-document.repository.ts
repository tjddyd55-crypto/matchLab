/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { ApplicationDocumentStatus, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const applicationDocumentRepository = {
  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).applicationDocument.findUnique({
      where: { id },
      include: {
        fighter: true,
        gym: { select: { id: true, name: true, phone: true } },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            location: true,
            organizerId: true,
            applicationFormTemplateId: true,
          },
        },
        template: true,
        batch: true,
        athleteConsent: true,
        guardianConsent: true,
        eventApplication: true,
      },
    });
  },

  async findByFighterBatch(
    batchId: string,
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).applicationDocument.findFirst({
      where: { batchId, fighterId },
    });
  },

  async create(
    data: {
      eventId: string;
      gymId: string;
      fighterId: string;
      batchId: string;
      templateId: string;
      originalTemplatePdfPath: string;
      formValuesJson?: Prisma.InputJsonValue;
      status?: ApplicationDocumentStatus;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).applicationDocument.create({
      data: {
        eventId: data.eventId,
        gymId: data.gymId,
        fighterId: data.fighterId,
        batchId: data.batchId,
        templateId: data.templateId,
        originalTemplatePdfPath: data.originalTemplatePdfPath,
        formValuesJson: data.formValuesJson ?? {},
        status: data.status ?? "draft",
      },
    });
  },

  async update(
    id: string,
    data: {
      status?: ApplicationDocumentStatus;
      formValuesJson?: Prisma.InputJsonValue;
      documentSnapshotJson?: Prisma.InputJsonValue | null;
      athleteConsentId?: string | null;
      guardianConsentId?: string | null;
      applicationId?: string | null;
      completedAt?: Date | null;
      submittedAt?: Date | null;
      generatedPdfPath?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).applicationDocument.update({
      where: { id },
      data: data as Prisma.ApplicationDocumentUncheckedUpdateInput,
    });
  },

  async findIdByGuardianConsentId(
    guardianConsentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    const row = await db(tx).applicationDocument.findFirst({
      where: { guardianConsentId },
      select: { id: true },
    });
    return row?.id ?? null;
  },

  async listForBatch(batchId: string, tx?: Prisma.TransactionClient) {
    return db(tx).applicationDocument.findMany({
      where: { batchId },
      include: {
        fighter: { select: { id: true, name: true, fighterCode: true } },
        athleteConsent: { select: { id: true, status: true, token: true, signedAt: true } },
        guardianConsent: {
          select: { id: true, consentStatus: true, signedAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
