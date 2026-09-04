import { parseISO } from "date-fns";

/** Asia/Seoul 달력·시각 — 서버(UTC)와 브라우저 로컬 타임존 차이로 인한 hydration mismatch 방지 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type KstParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

function parseKstParts(iso: string): KstParts | null {
  const ms = parseISO(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const kst = new Date(ms + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    weekday: kst.getUTCDay(),
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 공개 페이지용 날짜 표시 (ISO 8601 문자열, KST 고정) */
export function formatPublicDate(iso: string): string {
  const parts = parseKstParts(iso);
  if (!parts) return iso;
  return `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)} (${WEEKDAY_KO[parts.weekday]})`;
}

export function formatPublicDateTime(iso: string): string {
  const parts = parseKstParts(iso);
  if (!parts) return iso;
  return `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatPublicPeriod(fromIso: string, toIso: string): string {
  return `${formatPublicDate(fromIso)} ~ ${formatPublicDate(toIso)}`;
}

/**
 * Event `<input type="datetime-local">` 와 DB Date UTC 필드 간 wall-clock 매핑.
 * EventForm `toISOString().slice(0,16)` 표시와 동일한 기준(Seoul shift 없음).
 */
export function extractEventDatetimeLocalDateKey(at: Date): string {
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getUTCFullYear()}-${pad2(at.getUTCMonth() + 1)}-${pad2(at.getUTCDate())}`;
}

export function extractEventDatetimeLocalHm(at: Date): string | null {
  if (Number.isNaN(at.getTime())) return null;
  const h = at.getUTCHours();
  const m = at.getUTCMinutes();
  if (h === 0 && m === 0) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

export function eventDatetimeLocalValueFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dateKey = extractEventDatetimeLocalDateKey(d);
  const hm = extractEventDatetimeLocalHm(d);
  return hm ? `${dateKey}T${hm}` : `${dateKey}T00:00`;
}
