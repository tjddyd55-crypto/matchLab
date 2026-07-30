/**
 * 개인 PT 일정 — Asia/Seoul datetime helpers.
 * 출석 date-only(seoul-date.ts)와 분리: 여기서는 시각(분)까지 UTC로 저장한다.
 */
import {
  getSeoulYmdParts,
  getSeoulMonthRange,
  getSeoulWeekRange,
  toSeoulDateOnlyString,
  formatSeoulTimeHm,
} from "@/lib/gym-attendance/seoul-date";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export const SCHEDULE_MIN_DURATION_MS = 10 * 60 * 1000;
export const SCHEDULE_MAX_DURATION_MS = 8 * 60 * 60 * 1000;
export const SCHEDULE_DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** Seoul 달력 YYYY-MM-DD + HH:mm → UTC Date */
export function createSeoulDateTime(dateKey: string, hm: string): Date {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!dm || !tm) {
    throw new Error("invalid seoul datetime");
  }
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("invalid seoul datetime range");
  }
  // Seoul local → UTC: subtract +09:00
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - SEOUL_OFFSET_MS);
}

export function toSeoulDateKey(at: Date): string {
  return toSeoulDateOnlyString(at);
}

export function formatSeoulScheduleTime(at: Date): string {
  return formatSeoulTimeHm(at);
}

export function formatSeoulScheduleRange(startsAt: Date, endsAt: Date): string {
  return `${formatSeoulTimeHm(startsAt)}–${formatSeoulTimeHm(endsAt)}`;
}

/** [start, endExclusive) UTC instants covering Seoul calendar day */
export function getSeoulDayRange(dateKeyOrAt: string | Date): {
  start: Date;
  endExclusive: Date;
  dateKey: string;
} {
  const dateKey =
    typeof dateKeyOrAt === "string"
      ? dateKeyOrAt
      : toSeoulDateOnlyString(dateKeyOrAt);
  const start = createSeoulDateTime(dateKey, "00:00");
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive, dateKey };
}

export function getSeoulScheduleWeekRange(at: Date = new Date()): {
  start: Date;
  endExclusive: Date;
  startKey: string;
  endKeyExclusive: string;
} {
  const { start: dayStart, endExclusive: dayEnd } = getSeoulWeekRange(at);
  // getSeoulWeekRange returns UTC date-only midnight = Seoul calendar day start as UTC noon? 
  // Actually seoul-date stores UTC date-only (year-month-day as UTC). Convert to true Seoul day range.
  const startKey = `${dayStart.getUTCFullYear()}-${String(dayStart.getUTCMonth() + 1).padStart(2, "0")}-${String(dayStart.getUTCDate()).padStart(2, "0")}`;
  const endDay = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);
  const endKey = `${endDay.getUTCFullYear()}-${String(endDay.getUTCMonth() + 1).padStart(2, "0")}-${String(endDay.getUTCDate()).padStart(2, "0")}`;
  const start = createSeoulDateTime(startKey, "00:00");
  const endExclusive = createSeoulDateTime(endKey, "00:00");
  endExclusive.setTime(endExclusive.getTime() + 24 * 60 * 60 * 1000);
  return {
    start,
    endExclusive,
    startKey,
    endKeyExclusive: toSeoulDateOnlyString(endExclusive),
  };
}

export function getSeoulScheduleMonthRange(
  year: number,
  month1to12: number,
): { start: Date; endExclusive: Date } {
  const { start: d0, endExclusive: d1 } = getSeoulMonthRange(year, month1to12);
  const startKey = `${d0.getUTCFullYear()}-${String(d0.getUTCMonth() + 1).padStart(2, "0")}-${String(d0.getUTCDate()).padStart(2, "0")}`;
  const endKey = `${d1.getUTCFullYear()}-${String(d1.getUTCMonth() + 1).padStart(2, "0")}-${String(d1.getUTCDate()).padStart(2, "0")}`;
  const start = createSeoulDateTime(startKey, "00:00");
  // endExclusive of month range is first day of next month as UTC date-only
  const endExclusive = createSeoulDateTime(endKey, "00:00");
  return { start, endExclusive };
}

export function assertTenMinuteInstant(at: Date, label: string): void {
  const seoul = new Date(at.getTime() + SEOUL_OFFSET_MS);
  const minute = seoul.getUTCMinutes();
  const second = seoul.getUTCSeconds();
  const ms = seoul.getUTCMilliseconds();
  if (minute % 10 !== 0 || second !== 0 || ms !== 0) {
    throw new Error(`${label} must be on a 10-minute boundary`);
  }
}

export function isSameSeoulCalendarDay(a: Date, b: Date): boolean {
  return toSeoulDateOnlyString(a) === toSeoulDateOnlyString(b);
}

export function defaultEndsAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SCHEDULE_DEFAULT_DURATION_MS);
}

/** Week/day timeline: 30-minute grid from displayStartHour (default 6) */
export const SCHEDULE_GRID_START_HOUR = 6;
export const SCHEDULE_GRID_END_HOUR = 24;
export const SCHEDULE_PX_PER_MINUTE = 1.2;

export function minutesFromGridStart(at: Date): number {
  const seoul = new Date(at.getTime() + SEOUL_OFFSET_MS);
  const minutes =
    seoul.getUTCHours() * 60 +
    seoul.getUTCMinutes() -
    SCHEDULE_GRID_START_HOUR * 60;
  return Math.max(0, minutes);
}

export function scheduleBlockTopPx(startsAt: Date): number {
  return minutesFromGridStart(startsAt) * SCHEDULE_PX_PER_MINUTE;
}

export function scheduleBlockHeightPx(startsAt: Date, endsAt: Date): number {
  const mins = Math.max(
    10,
    (endsAt.getTime() - startsAt.getTime()) / (60 * 1000),
  );
  return mins * SCHEDULE_PX_PER_MINUTE;
}

export function scheduleGridTotalHeightPx(): number {
  return (
    (SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR) *
    60 *
    SCHEDULE_PX_PER_MINUTE
  );
}

export { getSeoulYmdParts, getSeoulWeekRange, getSeoulMonthRange };
