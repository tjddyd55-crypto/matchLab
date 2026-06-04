/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { CreditPaymentStatus, type Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const creditPaymentRepository = {
  async createPayment(
    data: {
      organizerId: string;
      userId: string | null;
      orderId: string;
      amountKrw: number;
      credits: number;
      provider?: string;
      memo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).organizerCreditPayment.create({
      data: {
        organizerId: data.organizerId,
        userId: data.userId,
        orderId: data.orderId,
        amountKrw: data.amountKrw,
        credits: data.credits,
        provider: data.provider ?? "toss",
        memo: data.memo ?? null,
        status: CreditPaymentStatus.pending,
      },
    });
  },

  async findByOrderId(orderId: string, tx?: Prisma.TransactionClient) {
    return db(tx).organizerCreditPayment.findUnique({
      where: { orderId },
    });
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).organizerCreditPayment.findUnique({
      where: { id },
    });
  },

  async markPaid(
    orderId: string,
    data: {
      paymentKey?: string | null;
      ledgerId: string;
      approvedAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizerCreditPayment.update({
      where: { orderId },
      data: {
        status: CreditPaymentStatus.paid,
        paymentKey: data.paymentKey ?? null,
        ledgerId: data.ledgerId,
        approvedAt: data.approvedAt,
      },
    });
  },

  async markFailed(
    orderId: string,
    failedAt: Date,
    memo: string | null,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizerCreditPayment.update({
      where: { orderId },
      data: {
        status: CreditPaymentStatus.failed,
        failedAt,
        memo,
      },
    });
  },

  async markCancelled(
    orderId: string,
    cancelledAt: Date,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizerCreditPayment.update({
      where: { orderId },
      data: {
        status: CreditPaymentStatus.cancelled,
        cancelledAt,
      },
    });
  },

  async listByOrganizerId(organizerId: string, limit = 30) {
    return prisma.organizerCreditPayment.findMany({
      where: { organizerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
