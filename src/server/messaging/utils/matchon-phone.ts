import {
  formatPhoneNumber,
  normalizeKrMobileCanonical,
} from "@/lib/phone";

/** MATCHON 메시징용 — 기존 phone helper 위임 (타 프로젝트 import 금지) */
export function normalizeMatchonPhone(input: string | null | undefined): string {
  return normalizeKrMobileCanonical(input);
}

export function validateMatchonPhone(input: string | null | undefined): {
  ok: boolean;
  normalized: string;
  message?: string;
} {
  const normalized = normalizeMatchonPhone(input);
  if (!normalized) {
    return { ok: false, normalized: "", message: "전화번호가 비어 있습니다." };
  }
  if (!/^01[016789]\d{7,8}$/.test(normalized)) {
    return {
      ok: false,
      normalized,
      message: "휴대폰 번호 형식이 올바르지 않습니다.",
    };
  }
  return { ok: true, normalized };
}

export function formatMatchonPhone(input: string | null | undefined): string {
  return formatPhoneNumber(input);
}

/** 로그/관리자 표시용 — 010-****-5678 */
export function maskMatchonPhone(input: string | null | undefined): string {
  const d = normalizeMatchonPhone(input);
  if (!d) return "";
  if (d.length < 7) return "***";
  const head = d.slice(0, 3);
  const tail = d.slice(-4);
  return `${head}-****-${tail}`;
}
