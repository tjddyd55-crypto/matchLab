/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { FighterConsentStatus, FighterConsentType, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const fighterConsentRepository = {
  async findByToken(token: string, tx?: Prisma.TransactionClient) {
    return db(tx).fighterConsent.findUnique({
      where: { token },
      include: {
        fighter: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            gender: true,
            schoolName: true,
            grade: true,
          },
        },
        event: {
          select: { id: true, title: true, eventDate: true, location: true },
        },
        linkedDocument: {
          include: { template: true },
        },
      },
    });
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).fighterConsent.findUnique({ where: { id } });
  },

  async create(
    data: {
      fighterId: string;
      eventId: string;
      eventApplicationId?: string | null;
      token: string;
      consentType: FighterConsentType;
      signerName: string;
      signerPhoneMasked?: string | null;
      documentTitle: string;
      documentSnapshotJson?: Prisma.InputJsonValue | null;
      expiresAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).fighterConsent.create({
      data: {
        fighterId: data.fighterId,
        eventId: data.eventId,
        eventApplicationId: data.eventApplicationId ?? null,
        token: data.token,
        consentType: data.consentType,
        status: "pending",
        signerName: data.signerName.trim(),
        signerPhoneMasked: data.signerPhoneMasked ?? null,
        documentTitle: data.documentTitle.trim(),
        documentSnapshotJson: data.documentSnapshotJson ?? undefined,
        expiresAt: data.expiresAt ?? null,
      },
    });
  },

  async complete(
    id: string,
    data: {
      signatureImagePath: string;
      signedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
      documentSnapshotJson?: Prisma.InputJsonValue | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).fighterConsent.update({
      where: { id },
      data: {
        status: "completed" satisfies FighterConsentStatus,
        signatureImagePath: data.signatureImagePath,
        signedAt: data.signedAt,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        ...(data.documentSnapshotJson !== undefined
          ? { documentSnapshotJson: data.documentSnapshotJson }
          : {}),
      } as Prisma.FighterConsentUncheckedUpdateInput,
    });
  },
};
