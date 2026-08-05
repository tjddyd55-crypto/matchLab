/**
 * 회원 포털 그룹수업 주간·월간 달력 SSOT (Asia/Seoul).
 * 브라우저 locale / UTC date-only 혼용을 피하고 YYYY-MM-DD 문자열만 다룬다.
 */
import {
  parseSeoulDateOnlyString,
  toSeoulDateOnlyString,
} from "@/lib/gym-attendance/seoul-date";
import {
  createSeoulDateTime,
  getSeoulScheduleMonthRange,
  getSeoulScheduleWeekRange,
} from "@/lib/gym-schedule/seoul-schedule";

export const MEMBER_PORTAL_CLASS_MAX_RANGE_DAYS = 45;

export type MemberPortalClassView = "week" | "month";

export type SeoulCalendarCell = {
  dateKey: string;
  day: number;
  inMonth: boolean;
};

const WEEKDAY_KO_SUN0 = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function parseMemberPortalClassView(
  raw: string | undefined | null,
): MemberPortalClassView {
  return raw === "month" ? "month" : "week";
}

export function parseMemberPortalDateKey(
  raw: string | undefined | null,
  fallbackAt: Date = new Date(),
): string {
  if (raw && parseSeoulDateOnlyString(raw)) {
    return raw.trim();
  }
  return toSeoulDateOnlyString(fallbackAt);
}

export function seoulDateKeyParts(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const parsed = parseSeoulDateOnlyString(dateKey);
  if (!parsed) {
    throw new Error(`invalid seoul dateKey: ${dateKey}`);
  }
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

export function addSeoulDateKeyDays(dateKey: string, days: number): string {
  const parsed = parseSeoulDateOnlyString(dateKey);
  if (!parsed) {
    throw new Error(`invalid seoul dateKey: ${dateKey}`);
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function seoulDateKeyWeekdayIndexSun0(dateKey: string): number {
  const parsed = parseSeoulDateOnlyString(dateKey);
  if (!parsed) {
    throw new Error(`invalid seoul dateKey: ${dateKey}`);
  }
  return parsed.getUTCDay();
}

export function seoulDateKeyWeekdayKo(dateKey: string): string {
  return WEEKDAY_KO_SUN0[seoulDateKeyWeekdayIndexSun0(dateKey)] ?? "";
}

/** 예: 8월 7일 금요일 */
export function formatSeoulDateKeyLongKo(dateKey: string): string {
  const { month, day } = seoulDateKeyParts(dateKey);
  return `${month}월 ${day}일 ${seoulDateKeyWeekdayKo(dateKey)}요일`;
}

/** 예: 8월 3일 – 8월 9일 */
export function formatSeoulWeekRangeLabel(
  startKey: string,
  endInclusiveKey: string,
): string {
  const a = seoulDateKeyParts(startKey);
  const b = seoulDateKeyParts(endInclusiveKey);
  return `${a.month}월 ${a.day}일 – ${b.month}월 ${b.day}일`;
}

/** 예: 2026년 8월 */
export function formatSeoulMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function getWeekRangeForDateKey(dateKey: string): {
  start: Date;
  endExclusive: Date;
  startKey: string;
  endInclusiveKey: string;
} {
  const week = getSeoulScheduleWeekRange(createSeoulDateTime(dateKey, "12:00"));
  return {
    start: week.start,
    endExclusive: week.endExclusive,
    startKey: week.startKey,
    endInclusiveKey: addSeoulDateKeyDays(week.startKey, 6),
  };
}

/** 월~일 7개 dateKey */
export function listSeoulWeekDateKeys(dateKey: string): string[] {
  const { startKey } = getWeekRangeForDateKey(dateKey);
  return Array.from({ length: 7 }, (_, i) => addSeoulDateKeyDays(startKey, i));
}

/**
 * 일~토 달력 그리드 (최대 6주 = 42칸).
 * 마지막 주가 전부 다음 달이면 35칸으로 자른다.
 */
export function buildSeoulMonthCalendarCells(
  year: number,
  month: number,
): SeoulCalendarCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = first.getUTCDay(); // 0=Sun
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - startOffset);

  const cells: SeoulCalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      dateKey,
      day,
      inMonth: m === month && y === year,
    });
  }

  const lastWeekAllOutside = cells
    .slice(35)
    .every((cell) => !cell.inMonth);
  return lastWeekAllOutside ? cells.slice(0, 35) : cells;
}

export function getMonthCalendarFetchRange(
  year: number,
  month: number,
): { start: Date; endExclusive: Date; startKey: string; endExclusiveKey: string } {
  const cells = buildSeoulMonthCalendarCells(year, month);
  const startKey = cells[0]!.dateKey;
  const lastKey = cells[cells.length - 1]!.dateKey;
  const endExclusiveKey = addSeoulDateKeyDays(lastKey, 1);
  return {
    start: createSeoulDateTime(startKey, "00:00"),
    endExclusive: createSeoulDateTime(endExclusiveKey, "00:00"),
    startKey,
    endExclusiveKey,
  };
}

export function getMonthCoreRange(
  year: number,
  month: number,
): { start: Date; endExclusive: Date } {
  return getSeoulScheduleMonthRange(year, month);
}

export function assertClassRangeWithinLimit(
  start: Date,
  endExclusive: Date,
): void {
  const ms = endExclusive.getTime() - start.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days <= 0 || days > MEMBER_PORTAL_CLASS_MAX_RANGE_DAYS) {
    throw new Error(
      `class range must be 1..${MEMBER_PORTAL_CLASS_MAX_RANGE_DAYS} days`,
    );
  }
}

export function shiftSeoulMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number; dateKey: string } {
  const idx = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(idx / 12);
  const nextMonth = (idx % 12) + 1;
  return {
    year: nextYear,
    month: nextMonth,
    dateKey: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

export const WEEK_STRIP_LABELS_MON = [
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
  "일",
] as const;

export const MONTH_GRID_LABELS_SUN = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;
