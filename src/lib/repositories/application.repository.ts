/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const organizerApplicationSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  memo: true,
  createdAt: true,
  appliedAt: true,
  fighterSnapshot: true,
  gymSnapshot: true,
  applicationAgreementSnapshot: true,
  fighter: {
    select: {
      id: true,
      name: true,
      profileImageUrl: true,
      birthDate: true,
      schoolName: true,
      grade: true,
      guardianName: true,
      guardianPhone: true,
    },
  },
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
  gym: { select: { id: true, name: true } },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      paymentStatus: true,
      depositorName: true,
      amount: true,
      confirmedAt: true,
    },
  },
} as const;

export const applicationRepository = {
  async listGymApplications(gymId: string) {
    return prisma.eventApplication.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        appliedAt: true,
        fighterSnapshot: true,
        event: {
          select: {
            id: true,
            title: true,
            publicSlug: true,
            registrationEndDate: true,
          },
        },
        division: {
          select: {
            id: true,
            sportType: true,
            ruleType: true,
            gender: true,
            weightClass: true,
            ageGroup: true,
            skillLevel: true,
          },
        },
      },
    });
  },

  async listApplicationsForFighter(fighterId: string) {
    return prisma.eventApplication.findMany({
      where: { fighterId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        gymId: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        appliedAt: true,
        fighterSnapshot: true,
        event: {
          select: {
            id: true,
            title: true,
            publicSlug: true,
            registrationEndDate: true,
            status: true,
          },
        },
        division: {
          select: {
            id: true,
            sportType: true,
            ruleType: true,
            gender: true,
            weightClass: true,
            ageGroup: true,
            skillLevel: true,
          },
        },
      },
    });
  },

  async listApplicationsForEvent(eventId: string) {
    return prisma.eventApplication.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      select: organizerApplicationSelect,
    });
  },

  async listApplicationsForOrganizerEvent(eventId: string) {
    return prisma.eventApplication.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      select: organizerApplicationSelect,
    });
  },

  async findApplicationById(
    applicationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplication.findUnique({
      where: { id: applicationId },
      include: {
        event: { select: { id: true, organizerId: true, title: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 2 },
      },
    });
  },

  async findExistingApplication(
    eventId: string,
    fighterId: string,
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplication.findUnique({
      where: {
        eventId_fighterId_divisionId: {
          eventId,
          fighterId,
          divisionId,
        },
      },
    });
  },

  async createEventApplicationWithPayment(
    data: {
      eventId: string;
      divisionId: string;
      gymId: string;
      fighterId: string;
      fighterSnapshot: Prisma.InputJsonValue;
      gymSnapshot: Prisma.InputJsonValue;
      applicationAgreementSnapshot: Prisma.InputJsonValue;
      appliedByUserId: string;
      appliedAt: Date;
      applicationProfileImageUrl?: string | null;
      memo?: string | null;
      feeAmount: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ applicationId: string; paymentId: string }> {
    const client = db(tx);
    const app = await client.eventApplication.create({
      data: {
        eventId: data.eventId,
        divisionId: data.divisionId,
        gymId: data.gymId,
        fighterId: data.fighterId,
        fighterSnapshot: data.fighterSnapshot,
        gymSnapshot: data.gymSnapshot,
        applicationAgreementSnapshot: data.applicationAgreementSnapshot,
        appliedByUserId: data.appliedByUserId,
        appliedAt: data.appliedAt,
        applicationProfileImageUrl: data.applicationProfileImageUrl ?? null,
        memo: data.memo ?? null,
        status: ApplicationStatus.pending,
        paymentStatus: PaymentStatus.unpaid,
      },
      select: { id: true },
    });

    const payment = await client.eventApplicationPayment.create({
      data: {
        eventApplicationId: app.id,
        amount: data.feeAmount,
        paymentMethod: "bank_transfer",
        paymentStatus: PaymentStatus.unpaid,
      },
      select: { id: true },
    });

    return { applicationId: app.id, paymentId: payment.id };
  },

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplication.update({
      where: { id: applicationId },
      data: { status },
    });
  },

  async updateApplicationPaymentStatusCache(
    applicationId: string,
    paymentStatus: PaymentStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplication.update({
      where: { id: applicationId },
      data: { paymentStatus },
    });
  },

  async patchApplication(
    applicationId: string,
    patch: Prisma.EventApplicationUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplication.update({
      where: { id: applicationId },
      data: patch,
    });
  },

  async findApplicationOwnershipContext(applicationId: string) {
    return prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        gymId: true,
        fighterId: true,
        status: true,
        paymentStatus: true,
        memo: true,
        event: { select: { organizerId: true } },
      },
    });
  },

  /** 인앱 알림용 — 휴대폰·생년월일 등 민감 필드 제외 */
  async findApplicationNotificationContext(
    applicationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        gymId: true,
        fighterId: true,
        fighter: { select: { userId: true } },
        gym: { select: { ownerUserId: true } },
        event: { select: { title: true, publicSlug: true } },
      },
    });
  },

  async countGymApplicationAttentionSummary(gymId: string): Promise<{
    pendingApproval: number;
    approvedPaymentIncomplete: number;
  }> {
    const [pendingApproval, approvedPaymentIncomplete] = await Promise.all([
      prisma.eventApplication.count({
        where: { gymId, status: ApplicationStatus.pending },
      }),
      prisma.eventApplication.count({
        where: {
          gymId,
          status: ApplicationStatus.approved,
          paymentStatus: {
            in: [PaymentStatus.unpaid, PaymentStatus.pending_check],
          },
        },
      }),
    ]);
    return { pendingApproval, approvedPaymentIncomplete };
  },

  async findApplicationsForEventAndGym(eventId: string, gymId: string) {
    return prisma.eventApplication.findMany({
      where: { eventId, gymId },
      select: {
        fighterId: true,
        divisionId: true,
        status: true,
      },
    });
  },
};