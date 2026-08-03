/** 비교·저장 정규화용 — 표시용 포맷과 분리 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * 한국 휴대폰 canonical 정규화 (인증·가입·비밀번호 찾기 SSOT).
 * 허용 입력: 01012345678 / 010-1234-5678 / +82 10-1234-5678 / +821012345678
 * 결과: 01012345678 형태 (숫자만). 일반 유선번호는 숫자만 반환.
 */
export function normalizeKrMobileCanonical(
  input: string | null | undefined,
): string {
  let d = normalizePhoneDigits(input ?? "");
  if (!d) return "";
  if (d.startsWith("82") && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  // +82 10… → 8210… → 010…
  if (d.startsWith("820") && d.length >= 12) {
    d = d.slice(2);
  }
  return d;
}

/** 휴대폰(01x) 검증. 실패 시 한글 메시지. */
export function validateKrMobile(
  input: string | null | undefined,
): { ok: true; normalized: string } | { ok: false; normalized: string; message: string } {
  const normalized = normalizeKrMobileCanonical(input);
  if (!normalized) {
    return {
      ok: false,
      normalized: "",
      message: "휴대폰 번호를 입력해 주세요.",
    };
  }
  if (!/^01[016789]\d{7,8}$/.test(normalized)) {
    return {
      ok: false,
      normalized,
      message: "올바른 휴대폰 번호 형식이 아닙니다.",
    };
  }
  return { ok: true, normalized };
}

/** 사업자등록번호 숫자만 (최대 10자리) */
export function normalizeBusinessRegistrationNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * 국내 전화 표시용 하이픈.
 * 저장은 normalizePhoneDigits(숫자만) 권장.
 */
export function formatPhoneNumber(input: string | null | undefined): string {
  if (!input) return "";
  const d = normalizePhoneDigits(input);
  if (!d) return "";

  // 대표번호 1588·1577·1544 등
  if (/^(15|16|18)\d{2}\d{4}$/.test(d) && d.length === 8) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }

  // 서울 02
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) {
      return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    }
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  // 휴대폰 010/011/016/017/018/019
  if (/^01[016789]/.test(d)) {
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  }

  // 기타 지역번호 (3자리)
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/** 사업자등록번호 123-45-67890 */
export function formatBusinessRegistrationNumber(
  input: string | null | undefined,
): string {
  if (!input) return "";
  const d = normalizeBusinessRegistrationNumber(input);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 10)}`;
}

/** 표시용: 빈값이면 미등록 */
export function formatPhoneDisplay(
  input: string | null | undefined,
  emptyLabel = "미등록",
): string {
  const formatted = formatPhoneNumber(input);
  return formatted || emptyLabel;
}
