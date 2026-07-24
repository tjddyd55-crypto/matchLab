import { normalizePhoneDigits } from "@/lib/phone";

/** 국내 휴대전화 출석 입력 검증 */
export function isValidKoreanMobilePhone(normalized: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalized);
}

export function normalizeAttendancePhone(input: string): string {
  return normalizePhoneDigits(input);
}

/**
 * 화면 표시용 이름 마스킹.
 * 박성용 → 박○용 / 김수 → 김○ / 한 글자 → ○
 */
export function maskMemberName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "회원";
  const chars = [...trimmed];
  if (chars.length === 1) return "○";
  if (chars.length === 2) return `${chars[0]}○`;
  return `${chars[0]}○${chars[chars.length - 1]}`;
}

/** 관리자 목록용 전화 마스킹 010-****-5678 */
export function maskPhoneForAdminList(phone: string | null | undefined): string {
  const d = normalizePhoneDigits(phone ?? "");
  if (d.length < 7) return "***";
  if (/^01[016789]/.test(d) && d.length >= 10) {
    return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
  }
  return `****${d.slice(-4)}`;
}
