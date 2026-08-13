/**
 * 대회 보험가입용 주민등록번호 — 형식/마스킹 SSOT.
 * GymMember/Fighter에 저장하지 않는다.
 */

const WEIGHTS = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5] as const;

export function normalizeResidentRegistrationNumber(
  raw: string | null | undefined,
): string {
  return (raw ?? "").replace(/\D/g, "");
}

export function formatResidentRegistrationNumberInput(digits: string): string {
  const d = normalizeResidentRegistrationNumber(digits);
  if (d.length <= 6) return d;
  return `${d.slice(0, 6)}-${d.slice(6, 13)}`;
}

export function maskResidentRegistrationNumber(
  raw: string | null | undefined,
): string | null {
  const digits = normalizeResidentRegistrationNumber(raw);
  if (digits.length !== 13) return null;
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
}

export function residentRegistrationChecksumDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(digits12[i]) * WEIGHTS[i]!;
  }
  return String((11 - (sum % 11)) % 10);
}

export function isValidResidentRegistrationChecksum(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  return residentRegistrationChecksumDigit(digits.slice(0, 12)) === digits[12];
}

export type ResidentRegistrationParseResult =
  | { ok: true; digits: string; masked: string; formatted: string }
  | { ok: false; error: string };

export function parseResidentRegistrationNumber(
  raw: string | null | undefined,
): ResidentRegistrationParseResult {
  const digits = normalizeResidentRegistrationNumber(raw);
  if (!digits) {
    return { ok: false, error: "주민등록번호를 입력해 주세요." };
  }
  if (digits.length !== 13) {
    return {
      ok: false,
      error: "주민등록번호는 13자리여야 합니다.",
    };
  }
  if (!isValidResidentRegistrationChecksum(digits)) {
    return {
      ok: false,
      error: "주민등록번호 형식이 올바르지 않습니다.",
    };
  }
  return {
    ok: true,
    digits,
    masked: maskResidentRegistrationNumber(digits)!,
    formatted: formatResidentRegistrationNumberInput(digits),
  };
}

/** 샘플/QA 전용 — 실제 개인 번호로 오인되지 않는 checksum-valid 값 */
export const SAMPLE_RESIDENT_REGISTRATION_NUMBER = "000000-0000001";
