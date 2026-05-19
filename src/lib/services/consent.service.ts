import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requiresGuardianConsent } from "@/lib/consent-policy";
import { ConsentStatus } from "@/lib/enums";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  maskGymPublicLabel,
  maskPhoneLoosely,
} from "@/lib/privacy-display";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import {
  consentRepository,
  type GuardianConsentEntity,
} from "@/lib/repositories/consent.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import type { GuardianConsentPublicFormView } from "@/lib/types/guardian-consent-public";

export type { GuardianConsentPublicFormView };

/** 동의 문서 고정 버전 (보관·감사 추적용). */
export const CONSENT_DOCUMENT_VERSION = "v1";

export const CONSENT_DOCUMENT_TITLE =
  "보호자 대회 참가 및 선수 등록 동의서";

export type CompleteGuardianConsentByTokenInput = {
  token?: string;
  consentId: string;
  registrationSubmissionId?: string;
  scope?: "registration" | "application";
  signatureImagePath: string;
  guardianName: string;
  guardianPhone: string;
  relationship: string;
  privacyAgreed: boolean;
  riskAgreed: boolean;
  emergencyAgreed: boolean;
  resultDisclosureAgreed: boolean;
  photoVideoAgreed: boolean;
  ipAddress: string | null;
  userAgent: string | null;
};

function assertValidConsentSignatureObjectPath(
  path: string,
  registrationSubmissionId: string,
  consentId: string,
): void {
  const prefix = `consents/${registrationSubmissionId}/${consentId}/`;
  if (!path.startsWith(prefix)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "서명 파일 경로가 올바르지 않습니다.",
    );
  }
  const tail = path.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.(png|webp)$/i.test(tail)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "서명 파일 경로가 올바르지 않습니다.",
    );
  }
}

function assertValidApplicationConsentSignatureObjectPath(
  path: string,
  documentId: string,
  consentId: string,
): void {
  const prefix = `application-consents/${documentId}/${consentId}/`;
  if (!path.startsWith(prefix)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "서명 파일 경로가 올바르지 않습니다.",
    );
  }
  const tail = path.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.(png|webp)$/i.test(tail)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "서명 파일 경로가 올바르지 않습니다.",
    );
  }
}

function maskGuardianDisplay(guardianName: string, guardianPhone: string): {
  guardianNameMasked: string;
  guardianPhoneMasked: string;
} {
  const pendingPhone =
    guardianPhone.trim() === "__PENDING__" || !guardianPhone.trim();
  const pendingName =
    guardianName.trim() === "(동의서 제출 시 확인)" ||
    !guardianName.trim();
  return {
    guardianNameMasked: pendingName
      ? "미입력"
      : `${guardianName.trim().slice(0, 1)}○○`,
    guardianPhoneMasked: pendingPhone ? "미입력" : maskPhoneLoosely(guardianPhone),
  };
}

async function buildPublicConsentView(
  consent: GuardianConsentEntity,
): Promise<GuardianConsentPublicFormView> {
  if (!consent.registrationSubmissionId) {
    throw new AppError("INTERNAL", "등록 제출과 연결되지 않은 동의서입니다.");
  }
  const submission = await registrationRepository.findSubmissionById(
    consent.registrationSubmissionId,
  );
  if (!submission) {
    throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
  }
  const gym = await registrationRepository.findGymNameById(submission.gymId);
  const gymDisplayLabel = maskGymPublicLabel(gym?.name ?? "");
  const { guardianNameMasked, guardianPhoneMasked } = maskGuardianDisplay(
    consent.guardianName,
    consent.guardianPhone,
  );

  return {
    consentId: consent.id,
    consentStatus: consent.consentStatus,
    documentTitle: consent.documentTitle,
    documentVersion: consent.documentVersion,
    gymDisplayLabel,
    fighterName: submission.name.trim(),
    guardianNameMasked,
    guardianPhoneMasked,
  };
}

async function buildApplicationPublicConsentView(
  consentId: string,
): Promise<GuardianConsentPublicFormView> {
  const row = await consentRepository.findGuardianConsentForPublic(consentId);
  if (
    !row ||
    !row.fighterId ||
    !row.eventId ||
    row.registrationSubmissionId
  ) {
    throw new AppError("NOT_FOUND", "대회 신청용 동의서를 찾을 수 없습니다.");
  }
  const { guardianNameMasked, guardianPhoneMasked } = maskGuardianDisplay(
    row.guardianName,
    row.guardianPhone,
  );
  return {
    consentId: row.id,
    consentStatus: row.consentStatus,
    documentTitle: row.documentTitle,
    documentVersion: row.documentVersion,
    gymDisplayLabel: row.event?.title ?? "대회 신청",
    fighterName: row.fighter?.name?.trim() ?? "선수",
    guardianNameMasked,
    guardianPhoneMasked,
  };
}

async function resolveGuardianConsentPublicSession(
  consentId: string,
  options: { token?: string; scope?: string },
): Promise<{
  view: GuardianConsentPublicFormView;
  registrationSubmissionId: string | null;
  documentId: string | null;
  scope: "registration" | "application";
}> {
  const scope =
    options.scope === "application" ? "application" : "registration";

  if (scope === "application") {
    const row = await consentRepository.findGuardianConsentForPublic(consentId);
    if (
      !row ||
      !row.fighterId ||
      !row.eventId ||
      row.registrationSubmissionId
    ) {
      throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
    }
    const view = await buildApplicationPublicConsentView(consentId);
    const documentId = row.linkedDocument?.id ?? null;
    return {
      view,
      registrationSubmissionId: null,
      documentId,
      scope: "application",
    };
  }

  const token = options.token?.trim();
  if (!token) {
    throw new AppError("VALIDATION_ERROR", "초대 토큰이 필요합니다.");
  }

  const consent = await consentRepository.findGuardianConsentById(consentId);
  if (!consent?.registrationSubmissionId) {
    throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
  }
  await consentRepository.assertInviteTokenForSubmission(
    token,
    consent.registrationSubmissionId,
  );
  const view = await buildPublicConsentView(consent);
  return {
    view,
    registrationSubmissionId: consent.registrationSubmissionId,
    documentId: null,
    scope: "registration",
  };
}

async function ensureConsentDraftForSubmissionImpl(
  submissionId: string,
  tx?: Prisma.TransactionClient,
): Promise<GuardianConsentEntity | null> {
  const submission = await registrationRepository.findSubmissionById(
    submissionId,
    tx,
  );
  if (!submission || !requiresGuardianConsent(submission)) {
    return null;
  }

  const existing =
    await consentRepository.findConsentForRegistrationSubmission(
      submissionId,
      tx,
    );
  if (existing) {
    return existing;
  }

  const guardianName =
    submission.guardianName?.trim() || "(동의서 제출 시 확인)";
  const guardianPhone =
    submission.guardianPhone?.trim() || "__PENDING__";

  const { id } = await consentRepository.createGuardianConsent(
    {
      registrationSubmissionId: submissionId,
      guardianName,
      guardianPhone,
      relationship: null,
      documentTitle: CONSENT_DOCUMENT_TITLE,
      documentVersion: CONSENT_DOCUMENT_VERSION,
    },
    tx,
  );

  const created = await consentRepository.findGuardianConsentById(id, tx);
  if (!created) {
    throw new AppError("INTERNAL", "동의서 생성 후 조회에 실패했습니다.");
  }
  return created;
}

export const consentService = {
  async ensureConsentDraftForRegistrationSubmission(
    submissionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GuardianConsentEntity | null> {
    return ensureConsentDraftForSubmissionImpl(submissionId, tx);
  },

  async createConsentForRegistrationSubmission(
    submissionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GuardianConsentEntity> {
    const submission = await registrationRepository.findSubmissionById(
      submissionId,
      tx,
    );
    if (!submission) {
      throw new AppError("NOT_FOUND", "등록 요청을 찾을 수 없습니다.");
    }
    if (!requiresGuardianConsent(submission)) {
      throw new AppError(
        "CONFLICT",
        "보호자 동의가 필요하지 않은 등록입니다.",
      );
    }
    const consent = await ensureConsentDraftForSubmissionImpl(
      submissionId,
      tx,
    );
    if (!consent) {
      throw new AppError(
        "INTERNAL",
        "보호자 동의 초안을 만들 수 없습니다.",
      );
    }
    return consent;
  },

  async getGuardianConsentPublicSession(
    consentId: string,
    options: { token?: string; scope?: string },
  ): Promise<{
    view: GuardianConsentPublicFormView;
    registrationSubmissionId: string | null;
    documentId: string | null;
    scope: "registration" | "application";
  }> {
    return resolveGuardianConsentPublicSession(consentId, options);
  },

  async getConsentFormByConsentId(
    consentId: string,
    token: string,
  ): Promise<GuardianConsentPublicFormView> {
    const { view } = await resolveGuardianConsentPublicSession(consentId, {
      token,
    });
    return view;
  },

  async getConsentFormBySubmissionToken(
    token: string,
    submissionId: string,
  ): Promise<GuardianConsentPublicFormView> {
    await consentRepository.assertInviteTokenForSubmission(token, submissionId);
    const consent =
      await consentRepository.findConsentForRegistrationSubmission(
        submissionId,
      );
    if (!consent) {
      throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
    }
    return buildPublicConsentView(consent);
  },

  async completeGuardianConsentByToken(
    input: CompleteGuardianConsentByTokenInput,
  ): Promise<void> {
    const scope = input.scope === "application" ? "application" : "registration";
    const consent = await consentRepository.findGuardianConsentById(
      input.consentId,
    );
    if (!consent) {
      throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
    }

    if (consent.consentStatus !== ConsentStatus.draft) {
      throw new AppError("CONFLICT", "이미 처리된 동의서입니다.");
    }

    if (
      !input.privacyAgreed ||
      !input.riskAgreed ||
      !input.emergencyAgreed ||
      !input.resultDisclosureAgreed ||
      !input.photoVideoAgreed
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "필수 동의 항목을 모두 확인해 주세요.",
      );
    }

    const signedAt = new Date();
    const guardianPhone = normalizePhoneDigits(input.guardianPhone.trim());

    if (scope === "application") {
      if (
        !consent.eventId ||
        !consent.fighterId ||
        consent.registrationSubmissionId
      ) {
        throw new AppError("NOT_FOUND", "대회 신청용 동의서를 찾을 수 없습니다.");
      }
      const documentId =
        await consentRepository.findDocumentIdByGuardianConsentId(
          input.consentId,
        );
      if (!documentId) {
        throw new AppError("NOT_FOUND", "연결된 신청서 문서를 찾을 수 없습니다.");
      }
      assertValidApplicationConsentSignatureObjectPath(
        input.signatureImagePath,
        documentId,
        input.consentId,
      );
      await consentRepository.completeGuardianConsent(input.consentId, {
        guardianName: input.guardianName.trim(),
        guardianPhone,
        relationship: input.relationship.trim(),
        signatureImagePath: input.signatureImagePath.trim(),
        signedAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      await applicationDocumentService.refreshDocumentStatusAfterSignature(
        documentId,
      );
      return;
    }

    const registrationSubmissionId = input.registrationSubmissionId?.trim();
    const token = input.token?.trim();
    if (!registrationSubmissionId || !token) {
      throw new AppError("VALIDATION_ERROR", "등록 동의 정보가 올바르지 않습니다.");
    }
    if (consent.registrationSubmissionId !== registrationSubmissionId) {
      throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
    }

    await consentRepository.assertInviteTokenForSubmission(
      token,
      registrationSubmissionId,
    );

    assertValidConsentSignatureObjectPath(
      input.signatureImagePath,
      registrationSubmissionId,
      input.consentId,
    );

    await consentRepository.completeGuardianConsent(input.consentId, {
      guardianName: input.guardianName.trim(),
      guardianPhone,
      relationship: input.relationship.trim(),
      signatureImagePath: input.signatureImagePath.trim(),
      signedAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  },

  async listGymConsents(actor: ActorContext) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);
    return consentRepository.listConsentsByGym(gymId);
  },
};
