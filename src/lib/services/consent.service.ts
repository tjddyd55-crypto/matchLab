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
import type { GuardianConsentPublicFormView } from "@/lib/types/guardian-consent-public";

export type { GuardianConsentPublicFormView };

/** 동의 문서 고정 버전 (보관·감사 추적용). */
export const CONSENT_DOCUMENT_VERSION = "v1";

export const CONSENT_DOCUMENT_TITLE =
  "보호자 대회 참가 및 선수 등록 동의서";

export type CompleteGuardianConsentByTokenInput = {
  token: string;
  consentId: string;
  registrationSubmissionId: string;
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

async function resolveGuardianConsentPublicSession(
  consentId: string,
  token: string,
): Promise<{
  view: GuardianConsentPublicFormView;
  registrationSubmissionId: string;
}> {
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
    token: string,
  ): Promise<{
    view: GuardianConsentPublicFormView;
    registrationSubmissionId: string;
  }> {
    return resolveGuardianConsentPublicSession(consentId, token);
  },

  async getConsentFormByConsentId(
    consentId: string,
    token: string,
  ): Promise<GuardianConsentPublicFormView> {
    const { view } = await resolveGuardianConsentPublicSession(
      consentId,
      token,
    );
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
    const consent = await consentRepository.findGuardianConsentById(
      input.consentId,
    );
    if (
      !consent?.registrationSubmissionId ||
      consent.registrationSubmissionId !== input.registrationSubmissionId
    ) {
      throw new AppError("NOT_FOUND", "동의서를 찾을 수 없습니다.");
    }

    await consentRepository.assertInviteTokenForSubmission(
      input.token,
      input.registrationSubmissionId,
    );

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

    assertValidConsentSignatureObjectPath(
      input.signatureImagePath,
      input.registrationSubmissionId,
      input.consentId,
    );

    const signedAt = new Date();

    const guardianPhone = normalizePhoneDigits(input.guardianPhone.trim());

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
