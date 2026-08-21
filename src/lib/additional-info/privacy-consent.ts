/**
 * 2차 추가정보 개인정보 동의 snapshot SSOT.
 */

export const ADDITIONAL_INFO_PRIVACY_CONSENT_TYPE = "additional_info_privacy" as const;
export const ADDITIONAL_INFO_PRIVACY_CONSENT_VERSION = "v1";
export const ADDITIONAL_INFO_PRIVACY_CONSENT_TITLE =
  "대회 참가 추가정보 개인정보 수집·이용 동의";
export const ADDITIONAL_INFO_PRIVACY_CONSENT_TEXT = [
  "대회 참가 및 보험·현장 운영을 위해 아래 개인정보를 수집·이용합니다.",
  "수집 항목: 성명, 생년월일, 주민등록번호, 주소, 연락처, 서명",
  "이용 목적: 대회 참가 자격 확인, 보험 가입, 현장 운영 및 안전 관리",
  "보유 기간: 대회 종료 및 관련 법령에 따른 기간",
].join("\n");
export const ADDITIONAL_INFO_PRIVACY_CONSENT_CHECKBOX_LABEL =
  "대회 참가 추가정보 개인정보 수집·이용에 동의합니다.";

export type AdditionalInfoPrivacyConsentProvenance =
  | "athlete_self"
  | "guardian_self"
  | "organizer_confirmed";

export type AdditionalInfoPrivacyConsentSnapshot = {
  type: typeof ADDITIONAL_INFO_PRIVACY_CONSENT_TYPE;
  version: string;
  title: string;
  text: string;
  agreed: true;
  agreedAt: string;
  appliedByUserId: string | null;
  provenance: AdditionalInfoPrivacyConsentProvenance;
};

export function buildAdditionalInfoPrivacyConsentSnapshot(input: {
  agreedAt: Date;
  appliedByUserId?: string | null;
  provenance: AdditionalInfoPrivacyConsentProvenance;
}): AdditionalInfoPrivacyConsentSnapshot {
  return {
    type: ADDITIONAL_INFO_PRIVACY_CONSENT_TYPE,
    version: ADDITIONAL_INFO_PRIVACY_CONSENT_VERSION,
    title: ADDITIONAL_INFO_PRIVACY_CONSENT_TITLE,
    text: ADDITIONAL_INFO_PRIVACY_CONSENT_TEXT,
    agreed: true,
    agreedAt: input.agreedAt.toISOString(),
    appliedByUserId: input.appliedByUserId ?? null,
    provenance: input.provenance,
  };
}

export function readAdditionalInfoPrivacyConsentSnapshot(
  raw: unknown,
): AdditionalInfoPrivacyConsentSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== ADDITIONAL_INFO_PRIVACY_CONSENT_TYPE) return null;
  if (o.agreed !== true) return null;
  if (typeof o.version !== "string" || typeof o.title !== "string") return null;
  if (typeof o.text !== "string" || typeof o.agreedAt !== "string") return null;
  const provenance = o.provenance;
  if (
    provenance !== "athlete_self" &&
    provenance !== "guardian_self" &&
    provenance !== "organizer_confirmed"
  ) {
    return null;
  }
  return {
    type: ADDITIONAL_INFO_PRIVACY_CONSENT_TYPE,
    version: o.version,
    title: o.title,
    text: o.text,
    agreed: true,
    agreedAt: o.agreedAt,
    appliedByUserId:
      typeof o.appliedByUserId === "string" ? o.appliedByUserId : null,
    provenance,
  };
}

export const PRIVACY_CONSENT_SNAPSHOT_KEY = "additionalInfoPrivacyConsent" as const;

export function readPrivacyConsentFromAgreementSnapshot(
  agreementSnapshot: unknown,
): AdditionalInfoPrivacyConsentSnapshot | null {
  if (!agreementSnapshot || typeof agreementSnapshot !== "object") return null;
  const o = agreementSnapshot as Record<string, unknown>;
  return readAdditionalInfoPrivacyConsentSnapshot(o[PRIVACY_CONSENT_SNAPSHOT_KEY]);
}
