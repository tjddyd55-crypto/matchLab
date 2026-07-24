/**
 * 출석일(attendanceDate) SSOT — Asia/Seoul 달력일.
 * UTC date-only(자정)로 저장해 hydration·타임존 밀림을 막는다.
 */

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주어진 시각의 Asia/Seoul 연·월·일 */
export function getSeoulYmdParts(
  at: Date = new Date(),
): { year: number; month: number; day: number } {
  const seoul = new Date(at.getTime() + SEOUL_OFFSET_MS);
  return {
    year: seoul.getUTCFullYear(),
    month: seoul.getUTCMonth() + 1,
    day: seoul.getUTCDate(),
  };
}

/** Asia/Seoul 달력일 → UTC date-only Date (DB 저장용) */
export function toSeoulAttendanceDate(at: Date = new Date()): Date {
  const { year, month, day } = getSeoulYmdParts(at);
  return new Date(Date.UTC(year, month - 1, day));
}

/** YYYY-MM-DD (Seoul) */
export function toSeoulDateOnlyString(at: Date = new Date()): string {
  const { year, month, day } = getSeoulYmdParts(at);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** HH:mm (Seoul) */
export function formatSeoulTimeHm(at: Date): string {
  const seoul = new Date(at.getTime() + SEOUL_OFFSET_MS);
  const h = String(seoul.getUTCHours()).padStart(2, "0");
  const m = String(seoul.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** 접근성용 시각 — 예: 오후 10시 35분 (Asia/Seoul) */
export function formatSeoulTimeAria(at: Date): string {
  const seoul = new Date(at.getTime() + SEOUL_OFFSET_MS);
  const h24 = seoul.getUTCHours();
  const m = seoul.getUTCMinutes();
  const period = h24 < 12 ? "오전" : "오후";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${period} ${h12}시 ${String(m).padStart(2, "0")}분`;
}

/** YYYY-MM-DD HH:mm (Seoul) */
export function formatSeoulDateTime(at: Date): string {
  return `${toSeoulDateOnlyString(at)} ${formatSeoulTimeHm(at)}`;
}

/** 월 범위 [start, endExclusive) — UTC date-only, Seoul 달력 기준 */
export function getSeoulMonthRange(
  year: number,
  month1to12: number,
): { start: Date; endExclusive: Date } {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1));
  const endExclusive = new Date(Date.UTC(year, month1to12, 1));
  return { start, endExclusive };
}

/** 이번 주(월~일) Seoul 달력 기준 [start, endExclusive) */
export function getSeoulWeekRange(at: Date = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const { year, month, day } = getSeoulYmdParts(at);
  const today = new Date(Date.UTC(year, month - 1, day));
  // JS: 0=Sun … 6=Sat → Monday-start
  const dow = today.getUTCDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - daysFromMonday);
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);
  return { start, endExclusive };
}

/** 이번 달 Seoul 달력 기준 */
export function getSeoulCurrentMonthRange(at: Date = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const { year, month } = getSeoulYmdParts(at);
  return getSeoulMonthRange(year, month);
}

/** YYYY-MM-DD → UTC date-only (이미 Seoul 달력일로 해석) */
export function parseSeoulDateOnlyString(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}
