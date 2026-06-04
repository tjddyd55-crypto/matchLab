/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { CreditLedgerType, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type CreateLedgerInput = {
  walletId: string;
  organizerId: string;
  type: CreditLedgerType;
  amount: number;
  balanceAfter: number;
  reason: string;
  eventId?: string | null;
  eventApplicationId?: string | null;
  paymentId?: string | null;
  paymentRef?: string | null;
  memo?: string | null;
  createdByUserId?: string | null;
};

export const creditRepository = {
  async findWalletByOrganizerId(
    organizerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).organizerCreditWallet.findUnique({
      where: { organizerId },
    });
  },

  async createWallet(
    organizerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).organizerCreditWallet.create({
      data: { organizerId, balance: 0 },
    });
  },

  async lockWalletByOrganizerId(
    organizerId: string,
    tx: Prisma.TransactionClient,
  ) {
    const rows = await tx.$queryRaw<
      { id: string; organizerId: string; balance: number }[]
    >`
      SELECT id, "organizerId", balance
      FROM "OrganizerCreditWallet"
      WHERE "organizerId" = ${organizerId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  },

  async updateWalletBalance(
    walletId: string,
    balance: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizerCreditWallet.update({
      where: { id: walletId },
      data: { balance },
    });
  },

  async createLedger(input: CreateLedgerInput, tx: Prisma.TransactionClient) {
    return tx.organizerCreditLedger.create({
      data: {
        walletId: input.walletId,
        organizerId: input.organizerId,
        type: input.type,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        reason: input.reason,
        eventId: input.eventId ?? null,
        eventApplicationId: input.eventApplicationId ?? null,
        paymentId: input.paymentId ?? null,
        paymentRef: input.paymentRef ?? null,
        memo: input.memo ?? null,
        createdByUserId: input.createdByUserId ?? null,
      },
    });
  },

  async listLedgersByOrganizerId(
    organizerId: string,
    limit = 50,
  ) {
    return prisma.organizerCreditLedger.findMany({
      where: { organizerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async findApplicationCreditState(
    applicationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        status: true,
        creditChargedAt: true,
        creditChargeLedgerId: true,
        creditChargeAmount: true,
        creditRefundedAt: true,
        creditRefundLedgerId: true,
        event: { select: { organizerId: true } },
      },
    });
  },

  async markApplicationCharged(
    applicationId: string,
    data: {
      creditChargedAt: Date;
      creditChargeLedgerId: string;
      creditChargeAmount: number;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.eventApplication.update({
      where: { id: applicationId },
      data: {
        creditChargedAt: data.creditChargedAt,
        creditChargeLedgerId: data.creditChargeLedgerId,
        creditChargeAmount: data.creditChargeAmount,
      },
    });
  },

  async markApplicationRefunded(
    applicationId: string,
    data: {
      creditRefundedAt: Date;
      creditRefundLedgerId: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.eventApplication.update({
      where: { id: applicationId },
      data: {
        creditRefundedAt: data.creditRefundedAt,
        creditRefundLedgerId: data.creditRefundLedgerId,
      },
    });
  },

  async findLedgerByApplicationAndType(
    eventApplicationId: string,
    type: CreditLedgerType,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).organizerCreditLedger.findFirst({
      where: { eventApplicationId, type },
    });
  },

  async listOrganizersForAdmin(limit = 200) {
    return prisma.organizer.findMany({
      orderBy: { name: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        creditWallet: { select: { balance: true } },
      },
    });
  },
};
