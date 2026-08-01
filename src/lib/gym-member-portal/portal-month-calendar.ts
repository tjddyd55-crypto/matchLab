/**
 * 회원 포털 월간 달력 셀 계산 (Asia/Seoul).
 * 관리자 캘린더와 분리 — 일요일 시작 7열.
 */
import { getSeoulYmdParts } from "@/lib/gym-attendance/seoul-date";
import {
  createSeoulDateTime,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";

const WEEKDAY_SUN_START = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type PortalMonthCell = {
  dateKey: string;
  day: number;
  inMonth: boolean;
};

export function getPortalWeekdayLabels(): readonly string[] {
  return WEEKDAY_SUN_START;
}

export function shiftPortalMonth(dateKey: string, delta: number): string {
  const { year, month, day } = getSeoulYmdParts(
    createSeoulDateTime(dateKey, "12:00"),
  );
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = next.getUTCFullYear();
  const m = next.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function formatPortalMonthTitle(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function formatPortalSelectedDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const weekday =
    WEEKDAY_SUN_START[new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).getUTCDay()];
  return `${m}월 ${d}일 ${weekday}요일`;
}

/** 일요일 시작 6주(42칸) */
export function buildPortalMonthCells(
  year: number,
  month: number,
): PortalMonthCell[] {
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const first = createSeoulDateTime(firstKey, "12:00");
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const start = new Date(first.getTime() - dow * 24 * 60 * 60 * 1000);
  const cells: PortalMonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const at = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = toSeoulDateKey(at);
    const parts = getSeoulYmdParts(at);
    cells.push({
      dateKey: key,
      day: parts.day,
      inMonth: parts.month === month && parts.year === year,
    });
  }
  return cells;
}

export function parsePortalYearMonth(
  yearRaw: string | undefined,
  monthRaw: string | undefined,
  fallbackAt: Date = new Date(),
): { year: number; month: number } {
  const parts = getSeoulYmdParts(fallbackAt);
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return { year: parts.year, month: parts.month };
}

export function resolvePortalSelectedDateKey(input: {
  dateRaw: string | undefined;
  year: number;
  month: number;
  todayKey: string;
}): string {
  const { dateRaw, year, month, todayKey } = input;
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [y, m] = dateRaw.split("-").map(Number);
    if (y === year && m === month) return dateRaw;
  }
  const [ty, tm] = todayKey.split("-").map(Number);
  if (ty === year && tm === month) return todayKey;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
