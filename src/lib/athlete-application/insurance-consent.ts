/**
 * 대회 참가자 보험가입 목적 개인정보 동의 snapshot SSOT.
 * true/false만 저장하지 않고 당시 문구를 보존한다.
 */

export const INSURANCE_PII_CONSENT_TYPE = "insurance_pii" as const;
export const INSURANCE_PII_CONSENT_VERSION = "v1";
export const INSURANCE_PII_CONSENT_TITLE =
  "대회 참가자 보험 가입을 위한 개인정보 수집·이용 동의";
export const INSURANCE_PII_CONSENT_TEXT = [
  "대회 참가자 보험 가입을 위해 아래 개인정보를 수집·이용합니다.",
  "수집 항목: 성명, 생년월일, 주민등록번호",
  "이용 목적: 대회 참가자 상해보험 가입 및 보험 처리",
  "보유 기간: 보험 처리 완료 후 관련 법령에 따른 기간",
].join("\n");

export const INSURANCE_PII_CONSENT_CHECKBOX_LABEL =
  "대회 참가자 보험 가입을 위한 개인정보 수집·이용에 동의합니다.";

export const INSURANCE_PII_ORGANIZER_CONFIRM_LABEL =
  "보험가입 개인정보 동의 확인 완료";

export type InsuranceConsentProvenance =
  | "athlete_self"
  | "gym_operator_attested"
  | "organizer_confirmed"
  | "excel_operator_attested";

export type InsuranceConsentSnapshot = {
  type: typeof INSURANCE_PII_CONSENT_TYPE;
  version: string;
  title: string;
  text: string;
  agreed: true;
  agreedAt: string;
  appliedByUserId: string | null;
  provenance: InsuranceConsentProvenance;
};

export function buildInsuranceConsentSnapshot(input: {
  agreedAt: Date;
  appliedByUserId?: string | null;
  provenance: InsuranceConsentProvenance;
  version?: string;
  title?: string;
  text?: string;
}): InsuranceConsentSnapshot {
  return {
    type: INSURANCE_PII_CONSENT_TYPE,
    version: input.version ?? INSURANCE_PII_CONSENT_VERSION,
    title: input.title ?? INSURANCE_PII_CONSENT_TITLE,
    text: input.text ?? INSURANCE_PII_CONSENT_TEXT,
    agreed: true,
    agreedAt: input.agreedAt.toISOString(),
    appliedByUserId: input.appliedByUserId ?? null,
    provenance: input.provenance,
  };
}

export function readInsuranceConsentSnapshot(
  raw: unknown,
): InsuranceConsentSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== INSURANCE_PII_CONSENT_TYPE) return null;
  if (o.agreed !== true) return null;
  if (typeof o.version !== "string" || typeof o.title !== "string") return null;
  if (typeof o.text !== "string" || typeof o.agreedAt !== "string") return null;
  const provenance = o.provenance;
  if (
    provenance !== "athlete_self" &&
    provenance !== "gym_operator_attested" &&
    provenance !== "organizer_confirmed" &&
    provenance !== "excel_operator_attested"
  ) {
    return null;
  }
  return {
    type: INSURANCE_PII_CONSENT_TYPE,
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

export function insuranceConsentDisplayLabel(
  snapshot: InsuranceConsentSnapshot | null,
): string {
  if (!snapshot) return "미입력";
  switch (snapshot.provenance) {
    case "organizer_confirmed":
      return "운영자 확인 완료";
    case "excel_operator_attested":
      return "엑셀 동의 확인";
    case "gym_operator_attested":
      return "체육관 확인 완료";
    default:
      return "동의";
  }
}

const EXCEL_CONSENT_TRUE = new Set(["동의", "y", "yes", "true", "1", "o"]);

export function parseExcelInsuranceConsent(
  raw: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  const folded = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!folded) {
    return {
      ok: false,
      error: "보험가입 개인정보 동의 값이 없습니다. 「동의」로 입력해 주세요.",
    };
  }
  if (EXCEL_CONSENT_TRUE.has(folded) || folded === "동의") {
    return { ok: true };
  }
  return {
    ok: false,
    error: "보험가입 개인정보 동의는 「동의」만 허용합니다.",
  };
}

/** 1차 신청: 빈값 허용, 값이 있으면 형식 검증 */
export function parseOptionalExcelInsuranceConsent(
  raw: string | null | undefined,
): { ok: true; agreed: boolean } | { ok: false; error: string } {
  const folded = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!folded) {
    return { ok: true, agreed: false };
  }
  const parsed = parseExcelInsuranceConsent(raw);
  if (!parsed.ok) return parsed;
  return { ok: true, agreed: true };
}
