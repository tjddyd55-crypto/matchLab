/** 생년월일 등 날짜만 의미 있는 필드 — 로컬 달력일 기준 UTC 자정 스텝으로 정규화 */

export function toUtcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

/**
 * DB에 UTC 자정으로 저장된 날짜-only 필드를 타임존 무관하게 표시.
 * 서버(UTC)·클라이언트(KST) hydration 불일치(#418)를 막는다.
 */
export function formatUtcDateOnly(
  value: Date | string,
  separator: "." | "-" = ".",
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${separator}${m}${separator}${day}`;
}

/** `<input>` defaultValue용 YYYY-MM-DD (UTC date-only) */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  return formatUtcDateOnly(value, "-");
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 숫자만 추출 후 최대 8자리(YYYYMMDD). 연도 5자리 이상 입력 차단. */
export function normalizeDateOnlyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function isCompleteDateOnlyString(value: string): boolean {
  return DATE_ONLY_RE.test(value.trim());
}

/** YYYY-MM-DD 형식 + 실제 달력일 존재 여부 */
export function isValidDateOnlyString(value: string): boolean {
  const m = DATE_ONLY_RE.exec(value.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** YYYY-MM-DD → UTC date-only Date. 잘못된 값이면 null */
export function parseDateOnlyString(value: string): Date | null {
  if (!isValidDateOnlyString(value)) return null;
  const [y, mo, d] = value.trim().split("-").map(Number);
  return new Date(Date.UTC(y!, mo! - 1, d!));
}

export function todayUtcDateOnlyString(): string {
  const now = new Date();
  return formatUtcDateOnly(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
    "-",
  );
}

/** 생년월일 등: 오늘(UTC date-only)보다 미래면 false */
export function isDateOnlyNotAfterToday(value: string): boolean {
  if (!isValidDateOnlyString(value)) return false;
  return value <= todayUtcDateOnlyString();
}
