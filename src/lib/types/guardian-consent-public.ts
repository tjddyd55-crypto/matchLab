import type { ConsentStatus } from "@/lib/enums";

/** 공개 동의 화면용 DTO — 서명 경로·연락처 원문·IP 등은 포함하지 않는다. */
export type GuardianConsentPublicFormView = {
  consentId: string;
  consentStatus: ConsentStatus;
  documentTitle: string;
  documentVersion: string;
  gymDisplayLabel: string;
  fighterName: string;
  guardianNameMasked: string;
  guardianPhoneMasked: string;
};
