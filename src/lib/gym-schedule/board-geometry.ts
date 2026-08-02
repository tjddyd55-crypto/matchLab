/**
 * 주/일 보드 기하 — 10분 snap, Y↔시각 변환.
 * 서버 SSOT(assertTenMinuteInstant)와 동일 경계를 클라이언트 미리보기에 맞춘다.
 */
import {
  SCHEDULE_GRID_END_HOUR,
  SCHEDULE_GRID_START_HOUR,
  SCHEDULE_MAX_DURATION_MS,
  SCHEDULE_MIN_DURATION_MS,
  SCHEDULE_PX_PER_MINUTE,
  createSeoulDateTime,
  formatSeoulScheduleTime,
} from "@/lib/gym-schedule/seoul-schedule";

export const SCHEDULE_SNAP_MINUTES = 10;

/** 주/일 보드 시간축 폭 (PC). `오전 10:00` 한 줄 기준. */
export const SCHEDULE_BOARD_AXIS_WIDTH_PX = 84;

export type BoardTimePatch = {
  dateKey: string;
  startHm: string;
  endHm: string;
  startsAt: Date;
  endsAt: Date;
};

/** 보드 시간축: `오전 7:00` / `오후 2:00` / `오후 12:00` / `오전 12:00` */
export function formatScheduleAxisTimeKorean(hour24: number): string {
  const hour = ((Math.floor(hour24) % 24) + 24) % 24;
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:00`;
}

/** 현재 시간선 등 분 포함: `오후 2:28` */
export function formatScheduleAxisDateTimeKorean(at: Date): string {
  const hm = formatSeoulScheduleTime(at);
  const [hStr, mStr] = hm.split(":");
  const hour = Number(hStr);
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:${mStr}`;
}

export function minutesToHm(totalMinutes: number): string {
  const clamped = Math.max(
    SCHEDULE_GRID_START_HOUR * 60,
    Math.min(SCHEDULE_GRID_END_HOUR * 60 - SCHEDULE_SNAP_MINUTES, totalMinutes),
  );
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function snapMinutes(raw: number): number {
  return Math.round(raw / SCHEDULE_SNAP_MINUTES) * SCHEDULE_SNAP_MINUTES;
}

/** 보드 컬럼 내 clientY → 그리드 시작 기준 분(스냅) */
export function pointerYToSnappedMinutes(
  clientY: number,
  columnTop: number,
): number {
  const raw =
    SCHEDULE_GRID_START_HOUR * 60 +
    (clientY - columnTop) / SCHEDULE_PX_PER_MINUTE;
  return snapMinutes(raw);
}

export function minutesFromDate(at: Date): number {
  return hmToMinutes(formatSeoulScheduleTime(at));
}

export function clampDurationMs(ms: number): number {
  return Math.min(
    SCHEDULE_MAX_DURATION_MS,
    Math.max(SCHEDULE_MIN_DURATION_MS, ms),
  );
}

export function durationLabel(startsAt: Date, endsAt: Date): string {
  const mins = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function buildRangeFromMinutes(
  dateKey: string,
  startMin: number,
  endMin: number,
): { dateKey: string; startHm: string; endHm: string; startsAt: Date; endsAt: Date } {
  let s = snapMinutes(startMin);
  let e = snapMinutes(endMin);
  const minSpan = SCHEDULE_SNAP_MINUTES;
  const maxSpan = SCHEDULE_MAX_DURATION_MS / 60000;
  if (e - s < minSpan) e = s + minSpan;
  if (e - s > maxSpan) e = s + maxSpan;
  const gridEnd = SCHEDULE_GRID_END_HOUR * 60;
  const gridStart = SCHEDULE_GRID_START_HOUR * 60;
  if (e > gridEnd) {
    e = gridEnd;
    s = Math.max(gridStart, e - maxSpan);
    s = snapMinutes(s);
  }
  if (s < gridStart) {
    s = gridStart;
    e = Math.min(gridEnd, s + (e - s));
  }
  const startHm = minutesToHm(s);
  const endHm = minutesToHm(e);
  return {
    dateKey,
    startHm,
    endHm,
    startsAt: createSeoulDateTime(dateKey, startHm),
    endsAt: createSeoulDateTime(dateKey, endHm),
  };
}

export function nowLineTopPx(now = new Date()): number | null {
  const seoulOffset = 9 * 60 * 60 * 1000;
  const seoul = new Date(now.getTime() + seoulOffset);
  const minutes = seoul.getUTCHours() * 60 + seoul.getUTCMinutes();
  if (
    minutes < SCHEDULE_GRID_START_HOUR * 60 ||
    minutes >= SCHEDULE_GRID_END_HOUR * 60
  ) {
    return null;
  }
  return (minutes - SCHEDULE_GRID_START_HOUR * 60) * SCHEDULE_PX_PER_MINUTE;
}

export function nowHmLabel(now = new Date()): string {
  return formatScheduleAxisDateTimeKorean(now);
}
