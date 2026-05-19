/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { ConsentStatus } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";

export type GuardianConsentEntity = {
  id: string;
  fighterId: string | null;
  registrationSubmissionId: string | null;
  eventId: string | null;
  guardianName: string;
  guardianPhone: string;
  relationship: string | null;
  documentTitle: string;
  documentVersion: string;
  consentStatus: ConsentStatus;
  signatureImagePath: string | null;
  signedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

async function assertInviteTokenMatchesSubmission(
  token: string,
  registrationSubmissionId: string,
): Promise<void> {
  const submission = await prisma.fighterRegistrationSubmission.findUnique({
    where: { id: registrationSubmissionId },
    select: { inviteLinkId: true },
  });
  if (!submission?.inviteLinkId) {
    throw new AppError(
      "FORBIDDEN",
      "초대 링크와 연결된 등록 요청이 아닙니다.",
    );
  }
  const link = await prisma.gymInviteLink.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!link || link.id !== submission.inviteLinkId) {
    throw new AppError("FORBIDDEN", "초대 토큰이 일치하지 않습니다.");
  }
}

export const consentRepository = {
  async assertInviteTokenForSubmission(
    token: string,
    registrationSubmissionId: string,
  ): Promise<void> {
    await assertInviteTokenMatchesSubmission(token, registrationSubmissionId);
  },

  /**
   * 등록 초대 토큰이 해당 제출의 inviteLink 와 일치하고, 동의서가 같은 제출에 매핑되어 있으며 draft 인지 검증.
   * (동의·서명 단계에서는 만료·maxUses 로 막지 않음 — 제출 시점에 이미 검증됨.)
   */
  async assertConsentInviteUploadAllowed(input: {
    token: string;
    registrationSubmissionId: string;
    consentId: string;
  }): Promise<void> {
    await assertInviteTokenMatchesSubmission(
      input.token,
      input.registrationSubmissionId,
    );
    const consent = await prisma.guardianConsent.findFirst({
      where: {
        id: input.consentId,
        registrationSubmissionId: input.registrationSubmissionId,
        consentStatus: ConsentStatus.draft,
      },
      select: { id: true },
    });
    if (!consent) {
      throw new AppError(
        "NOT_FOUND",
        "동의서를 찾을 수 없거나 이미 완료되었습니다.",
      );
    }
  },

  async findConsentAccessContext(consentId: string): Promise<{
    consentId: string;
    gymId: string;
    registrationSubmissionId: string;
  } | null> {
    const row = await prisma.guardianConsent.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        registrationSubmissionId: true,
        registrationSubmission: { select: { gymId: true } },
      },
    });
    if (
      !row?.registrationSubmissionId ||
      !row.registrationSubmission
    ) {
      return null;
    }
    return {
      consentId: row.id,
      gymId: row.registrationSubmission.gymId,
      registrationSubmissionId: row.registrationSubmissionId,
    };
  },

  async findConsentAccessContextByPath(path: string): Promise<{
    gymId: string;
  } | null> {
    const trimmed = path.trim();
    const m =
      /^consents\/([^/]+)\/([^/]+)\/[^/]+\.(png|webp)$/i.exec(trimmed);
    if (!m) return null;
    const submissionId = m[1];
    const consentId = m[2];
    const consent = await prisma.guardianConsent.findFirst({
      where: {
        id: consentId,
        registrationSubmissionId: submissionId,
      },
      select: {
        registrationSubmission: { select: { gymId: true } },
      },
    });
    if (!consent?.registrationSubmission) return null;
    return { gymId: consent.registrationSubmission.gymId };
  },

  async createGuardianConsent(
    data: {
      registrationSubmissionId: string;
      guardianName: string;
      guardianPhone: string;
      relationship?: string | null;
      documentTitle: string;
      documentVersion: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const row = await db(tx).guardianConsent.create({
      data: {
        registrationSubmissionId: data.registrationSubmissionId,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        relationship: data.relationship ?? null,
        documentTitle: data.documentTitle,
        documentVersion: data.documentVersion,
        consentStatus: ConsentStatus.draft,
      },
      select: { id: true },
    });
    return row;
  },

  async findGuardianConsentById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GuardianConsentEntity | null> {
    const row = await db(tx).guardianConsent.findUnique({
      where: { id },
    });
    return row as GuardianConsentEntity | null;
  },

  async findGuardianConsentForPublic(id: string) {
    return prisma.guardianConsent.findUnique({
      where: { id },
      include: {
        fighter: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        registrationSubmission: {
          select: { id: true, name: true, gymId: true, gym: { select: { name: true } } },
        },
        linkedDocument: { select: { id: true } },
      },
    });
  },

  async assertApplicationConsentUploadAllowed(input: {
    consentId: string;
    documentId: string;
  }): Promise<void> {
    const consent = await prisma.guardianConsent.findFirst({
      where: {
        id: input.consentId,
        consentStatus: ConsentStatus.draft,
        eventId: { not: null },
        fighterId: { not: null },
        registrationSubmissionId: null,
        linkedDocument: { id: input.documentId },
      },
      select: { id: true },
    });
    if (!consent) {
      throw new AppError(
        "NOT_FOUND",
        "동의서를 찾을 수 없거나 이미 완료되었습니다.",
      );
    }
  },

  async findDocumentIdByGuardianConsentId(
    consentId: string,
  ): Promise<string | null> {
    const row = await prisma.applicationDocument.findFirst({
      where: { guardianConsentId: consentId },
      select: { id: true },
    });
    return row?.id ?? null;
  },

  async findConsentForRegistrationSubmission(
    registrationSubmissionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GuardianConsentEntity | null> {
    const row = await db(tx).guardianConsent.findFirst({
      where: { registrationSubmissionId },
      orderBy: { createdAt: "desc" },
    });
    return row as GuardianConsentEntity | null;
  },

  async attachFighterToSubmissionConsents(
    registrationSubmissionId: string,
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).guardianConsent.updateMany({
      where: { registrationSubmissionId },
      data: { fighterId },
    });
  },

  async findLatestConsentForFighter(
    fighterId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GuardianConsentEntity | null> {
    const row = await db(tx).guardianConsent.findFirst({
      where: { fighterId },
      orderBy: { createdAt: "desc" },
    });
    return row as GuardianConsentEntity | null;
  },

  async updateConsentSignaturePath(
    consentId: string,
    path: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).guardianConsent.update({
      where: { id: consentId },
      data: { signatureImagePath: path },
    });
  },

  async completeGuardianConsent(
    consentId: string,
    data: {
      guardianName: string;
      guardianPhone: string;
      relationship: string | null;
      signatureImagePath: string;
      signedAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).guardianConsent.update({
      where: { id: consentId },
      data: {
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        relationship: data.relationship,
        signatureImagePath: data.signatureImagePath,
        consentStatus: ConsentStatus.completed,
        signedAt: data.signedAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  },

  async listConsentsByGym(gymId: string): Promise<
    {
      id: string;
      consentStatus: ConsentStatus;
      createdAt: Date;
      registrationSubmission: {
        id: string;
        name: string;
      } | null;
    }[]
  > {
    return prisma.guardianConsent.findMany({
      where: {
        registrationSubmission: { gymId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        consentStatus: true,
        createdAt: true,
        registrationSubmission: {
          select: { id: true, name: true },
        },
      },
    });
  },
};
