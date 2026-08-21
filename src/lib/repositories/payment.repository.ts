/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 * 진실 원천: EventApplicationPayment (`status-machine.md`).
 */

import type { Prisma } from "@/generated/prisma";
import { PaymentStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type PaymentOwnershipContext = {
  paymentId: string;
  applicationId: string;
  eventId: string;
  organizerId: string;
  gymId: string;
};

export type PaymentWithApplicationRow = {
  id: string;
  eventApplicationId: string;
  amount: number;
  paymentStatus: PaymentStatus;
  depositorName: string | null;
  memo: string | null;
  confirmedByUserId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
};

export const paymentRepository = {
  async findPaymentByApplicationId(
    applicationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentWithApplicationRow | null> {
    return db(tx).eventApplicationPayment.findFirst({
      where: { eventApplicationId: applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventApplicationId: true,
        amount: true,
        paymentStatus: true,
        depositorName: true,
        memo: true,
        confirmedByUserId: true,
        confirmedAt: true,
        createdAt: true,
      },
    });
  },

  async findPaymentById(
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<(PaymentWithApplicationRow & { eventApplicationId: string }) | null> {
    return db(tx).eventApplicationPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        eventApplicationId: true,
        amount: true,
        paymentStatus: true,
        depositorName: true,
        memo: true,
        confirmedByUserId: true,
        confirmedAt: true,
        createdAt: true,
      },
    });
  },

  async createApplicationPayment(
    data: {
      eventApplicationId: string;
      amount: number;
      paymentMethod?: string;
      paymentStatus?: PaymentStatus;
      depositorName?: string | null;
      memo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    return db(tx).eventApplicationPayment.create({
      data: {
        eventApplicationId: data.eventApplicationId,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? "bank_transfer",
        paymentStatus: data.paymentStatus ?? PaymentStatus.unpaid,
        depositorName: data.depositorName ?? null,
        memo: data.memo ?? null,
      },
      select: { id: true },
    });
  },

  async updateApplicationPaymentStatus(
    paymentId: string,
    data: {
      paymentStatus: PaymentStatus;
      depositorName?: string | null;
      confirmedByUserId?: string | null;
      confirmedAt?: Date | null;
      memo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplicationPayment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: data.paymentStatus,
        ...(data.depositorName !== undefined
          ? { depositorName: data.depositorName }
          : {}),
        ...(data.confirmedByUserId !== undefined
          ? { confirmedByUserId: data.confirmedByUserId }
          : {}),
        ...(data.confirmedAt !== undefined
          ? { confirmedAt: data.confirmedAt }
          : {}),
        ...(data.memo !== undefined ? { memo: data.memo } : {}),
      },
    });
  },

  async listPaymentsForEvent(eventId: string) {
    return prisma.eventApplicationPayment.findMany({
      where: { eventApplication: { eventId } },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        paymentStatus: true,
        amount: true,
        depositorName: true,
        memo: true,
        confirmedAt: true,
        eventApplicationId: true,
        eventApplication: {
          select: {
            id: true,
            fighterId: true,
            gymId: true,
            divisionId: true,
            status: true,
            paymentStatus: true,
            fighterSnapshot: true,
            gymSnapshot: true,
          },
        },
      },
    });
  },

  async findPaymentOwnershipContext(
    paymentId: string,
  ): Promise<PaymentOwnershipContext | null> {
    const row = await prisma.eventApplicationPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        eventApplication: {
          select: {
            id: true,
            eventId: true,
            gymId: true,
            event: { select: { organizerId: true } },
          },
        },
      },
    });
    if (
      !row?.eventApplication?.eventId ||
      !row.eventApplication.event?.organizerId
    ) {
      return null;
    }
    return {
      paymentId: row.id,
      applicationId: row.eventApplication.id,
      eventId: row.eventApplication.eventId,
      gymId: row.eventApplication.gymId ?? "",
      organizerId: row.eventApplication.event.organizerId,
    };
  },
};
