import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { FighterConsentStatus } from "@/lib/enums";
import { maskBirthYearOnly } from "@/lib/privacy-display";
import { fighterConsentRepository } from "@/lib/repositories/fighter-consent.repository";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import type { CompleteFighterConsentByTokenInput } from "@/lib/validators/fighter-consent.validator";

export type AthleteSignPublicView = {
  token: string;
  consentId: string;
  documentId: string | null;
  consentStatus: FighterConsentStatus;
  documentTitle: string;
  eventTitle: string;
  fighterName: string;
  birthYearMasked: string;
  policyLines: string[];
};

export const fighterConsentService = {
  async getPublicSignSession(token: string): Promise<AthleteSignPublicView> {
    const consent = await fighterConsentRepository.findByToken(token);
    if (!consent) {
      throw new AppError("NOT_FOUND", "유효하지 않거나 만료된 링크입니다.");
    }
    const documentId = consent.linkedDocument?.id ?? null;

    if (consent.status === FighterConsentStatus.completed) {
      return {
        token,
        consentId: consent.id,
        documentId,
        consentStatus: consent.status,
        documentTitle: consent.documentTitle,
        eventTitle: consent.event.title,
        fighterName: consent.fighter.name,
        birthYearMasked: maskBirthYearOnly(consent.fighter.birthDate),
        policyLines: [
          "이 서명은 해당 대회 참가 신청서에 대한 선수 본인 확인입니다.",
          "주최측 공식 신청서 양식에 따라 진행됩니다.",
        ],
      };
    }
    if (
      consent.status === FighterConsentStatus.expired ||
      consent.status === FighterConsentStatus.revoked
    ) {
      throw new AppError("FORBIDDEN", "만료되었거나 폐기된 서명 링크입니다.");
    }
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      throw new AppError("FORBIDDEN", "서명 링크가 만료되었습니다.");
    }

    return {
      token,
      consentId: consent.id,
      documentId,
      consentStatus: consent.status,
      documentTitle: consent.documentTitle,
      eventTitle: consent.event.title,
      fighterName: consent.fighter.name,
      birthYearMasked: maskBirthYearOnly(consent.fighter.birthDate),
      policyLines: [
        "이 서명은 해당 대회 참가 신청서에 대한 선수 본인 확인입니다.",
        "주최측 공식 신청서 양식에 따라 진행됩니다.",
      ],
    };
  },

  async completeByToken(
    input: CompleteFighterConsentByTokenInput,
    meta: { ipAddress: string | null; userAgent: string | null },
  ): Promise<void> {
    const consent = await fighterConsentRepository.findByToken(input.token);
    if (!consent) {
      throw new AppError("NOT_FOUND", "유효하지 않거나 만료된 링크입니다.");
    }
    if (consent.status === FighterConsentStatus.completed) {
      throw new AppError("CONFLICT", "이미 서명이 완료되었습니다.");
    }

    const prefix = `application-signatures/${consent.linkedDocument?.id ?? "unknown"}/${consent.id}/`;
    if (!input.signatureImagePath.startsWith(prefix)) {
      throw new AppError("VALIDATION_ERROR", "서명 파일 경로가 올바르지 않습니다.");
    }

    const signedAt = new Date();
    await fighterConsentRepository.complete(consent.id, {
      signatureImagePath: input.signatureImagePath,
      signedAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const documentId = consent.linkedDocument?.id;
    if (documentId) {
      await applicationDocumentService.refreshDocumentStatusAfterSignature(
        documentId,
      );
    }
  },
};
