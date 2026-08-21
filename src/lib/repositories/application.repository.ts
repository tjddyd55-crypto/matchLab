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

function toPrismaBytes(
  value: Uint8Array | null | undefined,
): Uint8Array<ArrayBuffer> | null {
  if (!value) return null;
  const copy = new Uint8Array(new ArrayBuffer(value.byteLength));
  copy.set(value);
  return copy;
}

const organizerApplicationSelect = {
  id: true,
  divisionId: true,
  divisionSelectionType: true,
  requestedDivisionText: true,
  status: true,
  paymentStatus: true,
  cancellationSource: true,
  memo: true,
  createdAt: true,
  appliedAt: true,
  fighterSnapshot: true,
  gymSnapshot: true,
  applicationAgreementSnapshot: true,
  recordText: true,
  careerText: true,
  insuranceRrnMasked: true,
  insuranceConsentSnapshot: true,
  additionalInfoStatus: true,
  additionalInfoCompletedAt: true,
  additionalInfoRecipientMasked: true,
  additionalInfoRecipientPhone: true,
  fighter: {
    select: {
      id: true,
      name: true,
      profileImageUrl: true,
      birthDate: true,
      gender: true,
      phone: true,
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
      weightClassName: true,
      weightLimitText: true,
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
        divisionSelectionType: true,
        requestedDivisionText: true,
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
        divisionSelectionType: true,
        requestedDivisionText: true,
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

  async findOrganizerApplicationForPrint(eventId: string, applicationId: string) {
    return prisma.eventApplication.findFirst({
      where: { id: applicationId, eventId },
      select: {
        ...organizerApplicationSelect,
        event: { select: { id: true, title: true } },
      },
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
    divisionId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    if (divisionId) {
      return db(tx).eventApplication.findUnique({
        where: {
          eventId_fighterId_divisionId: {
            eventId,
            fighterId,
            divisionId,
          },
        },
      });
    }
    // OTHER: unique (eventId,fighterId,NULL) is not enforced by PG — explicit lookup
    return db(tx).eventApplication.findFirst({
      where: {
        eventId,
        fighterId,
        divisionId: null,
        divisionSelectionType: "OTHER",
        status: { notIn: ["cancelled", "rejected"] },
      },
    });
  },

  async listImportIdentitiesForEvent(eventId: string) {
    return prisma.eventApplication.findMany({
      where: { eventId },
      select: {
        id: true,
        divisionId: true,
        gymSnapshot: true,
        fighter: {
          select: { name: true, birthDate: true, gender: true },
        },
      },
    });
  },

  async createEventApplicationWithPayment(
    data: {
      eventId: string;
      divisionId: string | null;
      divisionSelectionType?: "REGISTERED" | "OTHER";
      requestedDivisionText?: string | null;
      gymId: string;
      fighterId: string;
      fighterSnapshot: Prisma.InputJsonValue;
      gymSnapshot: Prisma.InputJsonValue;
      applicationAgreementSnapshot: Prisma.InputJsonValue;
      appliedByUserId: string | null;
      appliedAt: Date;
      applicationProfileImageUrl?: string | null;
      memo?: string | null;
      recordText?: string | null;
      careerText?: string | null;
      totalBoutsSnapshot?: number | null;
      winsSnapshot?: number | null;
      drawsSnapshot?: number | null;
      lossesSnapshot?: number | null;
      schoolLevelSnapshot?: string | null;
      schoolGradeSnapshot?: number | null;
      insuranceRrnCipher?: Uint8Array | null;
      insuranceRrnIv?: Uint8Array | null;
      insuranceRrnAuthTag?: Uint8Array | null;
      insuranceRrnKeyVer?: string | null;
      insuranceRrnMasked?: string | null;
      insuranceConsentSnapshot?: Prisma.InputJsonValue | null;
      feeAmount: number;
      initialApplicationStatus?: ApplicationStatus;
      initialPaymentStatus?: PaymentStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ applicationId: string; paymentId: string }> {
    const client = db(tx);
    const applicationStatus =
      data.initialApplicationStatus ?? ApplicationStatus.pending;
    const paymentStatus = data.initialPaymentStatus ?? PaymentStatus.unpaid;
    const selectionType =
      data.divisionSelectionType ??
      (data.divisionId ? "REGISTERED" : "OTHER");
    const app = await client.eventApplication.create({
      data: {
        eventId: data.eventId,
        divisionId: data.divisionId,
        divisionSelectionType: selectionType,
        requestedDivisionText: data.requestedDivisionText?.trim() || null,
        gymId: data.gymId,
        fighterId: data.fighterId,
        fighterSnapshot: data.fighterSnapshot,
        gymSnapshot: data.gymSnapshot,
        applicationAgreementSnapshot: data.applicationAgreementSnapshot,
        appliedByUserId: data.appliedByUserId,
        appliedAt: data.appliedAt,
        applicationProfileImageUrl: data.applicationProfileImageUrl ?? null,
        memo: data.memo ?? null,
        recordText: data.recordText?.trim() || null,
        careerText: data.careerText?.trim() || null,
        totalBoutsSnapshot: data.totalBoutsSnapshot ?? null,
        winsSnapshot: data.winsSnapshot ?? null,
        drawsSnapshot: data.drawsSnapshot ?? null,
        lossesSnapshot: data.lossesSnapshot ?? null,
        schoolLevelSnapshot: data.schoolLevelSnapshot ?? null,
        schoolGradeSnapshot: data.schoolGradeSnapshot ?? null,
        insuranceRrnCipher: toPrismaBytes(data.insuranceRrnCipher),
        insuranceRrnIv: toPrismaBytes(data.insuranceRrnIv),
        insuranceRrnAuthTag: toPrismaBytes(data.insuranceRrnAuthTag),
        insuranceRrnKeyVer: data.insuranceRrnKeyVer ?? null,
        insuranceRrnMasked: data.insuranceRrnMasked ?? null,
        insuranceConsentSnapshot: data.insuranceConsentSnapshot ?? undefined,
        status: applicationStatus,
        paymentStatus,
      },
      select: { id: true },
    });

    const payment = await client.eventApplicationPayment.create({
      data: {
        eventApplicationId: app.id,
        amount: data.feeAmount,
        paymentMethod: "bank_transfer",
        paymentStatus,
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

  async updateAdditionalInfoSubmission(
    applicationId: string,
    data: {
      insuranceRrnCipher: Uint8Array;
      insuranceRrnIv: Uint8Array;
      insuranceRrnAuthTag: Uint8Array;
      insuranceRrnKeyVer: string;
      insuranceRrnMasked: string;
      insuranceConsentSnapshot: Prisma.InputJsonValue;
      participantAddress: string;
      participantAddressDetail: string | null;
      additionalInfoGuardianRelation: string | null;
      additionalInfoSignatureObjectKey: string;
      applicationAgreementSnapshot: Prisma.InputJsonValue;
      additionalInfoStatus: "COMPLETED";
      additionalInfoCompletedAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventApplication.update({
      where: { id: applicationId },
      data: {
        insuranceRrnCipher: toPrismaBytes(data.insuranceRrnCipher),
        insuranceRrnIv: toPrismaBytes(data.insuranceRrnIv),
        insuranceRrnAuthTag: toPrismaBytes(data.insuranceRrnAuthTag),
        insuranceRrnKeyVer: data.insuranceRrnKeyVer,
        insuranceRrnMasked: data.insuranceRrnMasked,
        insuranceConsentSnapshot: data.insuranceConsentSnapshot,
        participantAddress: data.participantAddress,
        participantAddressDetail: data.participantAddressDetail,
        additionalInfoGuardianRelation: data.additionalInfoGuardianRelation,
        additionalInfoSignatureObjectKey: data.additionalInfoSignatureObjectKey,
        applicationAgreementSnapshot: data.applicationAgreementSnapshot,
        additionalInfoStatus: data.additionalInfoStatus,
        additionalInfoCompletedAt: data.additionalInfoCompletedAt,
      },
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
        cancellationSource: true,
        memo: true,
        payments: {
          select: { id: true, paymentStatus: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        event: { select: { organizerId: true, title: true } },
      },
    });
  },

  /** OTHER → 등록 체급 지정용 */
  async findApplicationForOtherDivisionResolve(applicationId: string) {
    return prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        fighterId: true,
        divisionId: true,
        divisionSelectionType: true,
        requestedDivisionText: true,
        status: true,
        fighter: { select: { id: true, name: true, gender: true } },
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

  async listGymEventApplications(gymId: string, eventId: string) {
    return prisma.eventApplication.findMany({
      where: { gymId, eventId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fighterId: true,
        divisionId: true,
        divisionSelectionType: true,
        requestedDivisionText: true,
        status: true,
        paymentStatus: true,
        memo: true,
        checkInStatus: true,
        weighInStatus: true,
        appliedAt: true,
        createdAt: true,
        fighterSnapshot: true,
        applicationAgreementSnapshot: true,
        applicationDocumentId: true,
        fighter: { select: { id: true, name: true } },
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
    });
  },

  async listFighterApplicationsWithField(fighterId: string) {
    return prisma.eventApplication.findMany({
      where: { fighterId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        gymId: true,
        fighterId: true,
        divisionId: true,
        divisionSelectionType: true,
        requestedDivisionText: true,
        status: true,
        paymentStatus: true,
        memo: true,
        checkInStatus: true,
        weighInStatus: true,
        appliedAt: true,
        createdAt: true,
        fighterSnapshot: true,
        applicationAgreementSnapshot: true,
        applicationDocumentId: true,
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
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
        gym: { select: { id: true, name: true } },
      },
    });
  },

  async listFighterHandicapFieldsForEvent(eventId: string) {
    return prisma.eventApplication.findMany({
      where: {
        eventId,
        status: ApplicationStatus.approved,
      },
      select: {
        fighterId: true,
        weighInStatus: true,
        weighInFailureResolution: true,
        handicapNote: true,
        checkInStatus: true,
        disqualificationReason: true,
      },
    });
  },

  async findApplicationForAdditionalInfo(applicationId: string) {
    return prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        fighterId: true,
        additionalInfoStatus: true,
        additionalInfoRequestedAt: true,
        additionalInfoTokenHash: true,
        additionalInfoRecipientType: true,
        additionalInfoRecipientPhone: true,
        additionalInfoRecipientMasked: true,
        fighterSnapshot: true,
        fighter: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            phone: true,
            guardianName: true,
            guardianPhone: true,
          },
        },
        event: { select: { id: true, title: true, organizerId: true } },
      },
    });
  },

  /** @deprecated alias — prefer findApplicationForAdditionalInfo */
  async findApplicationForAdditionalInfoRequest(applicationId: string) {
    return this.findApplicationForAdditionalInfo(applicationId);
  },

  async listApplicationsForAdditionalInfo(eventId: string) {
    return prisma.eventApplication.findMany({
      where: { eventId },
      select: {
        id: true,
        additionalInfoStatus: true,
        fighter: {
          select: {
            birthDate: true,
            phone: true,
            guardianPhone: true,
          },
        },
      },
    });
  },

  /** @deprecated alias — prefer listApplicationsForAdditionalInfo */
  async listApplicationsForAdditionalInfoBulk(eventId: string) {
    return this.listApplicationsForAdditionalInfo(eventId);
  },

  async findApplicationByAdditionalInfoTokenHash(tokenHash: string) {
    return prisma.eventApplication.findUnique({
      where: { additionalInfoTokenHash: tokenHash },
      select: {
        id: true,
        eventId: true,
        fighterId: true,
        additionalInfoStatus: true,
        additionalInfoTokenExpiresAt: true,
        divisionSelectionType: true,
        requestedDivisionText: true,
        fighterSnapshot: true,
        gymSnapshot: true,
        applicationAgreementSnapshot: true,
        insuranceRrnMasked: true,
        participantAddress: true,
        participantAddressDetail: true,
        fighter: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            guardianName: true,
            guardianPhone: true,
          },
        },
        gym: { select: { id: true, name: true } },
        division: {
          select: {
            id: true,
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            weightClassName: true,
            weightLimitText: true,
            skillLevel: true,
          },
        },
        event: { select: { id: true, title: true } },
      },
    });
  },
};