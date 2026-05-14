import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

/** 공개 페이지용 날짜 표시 (ISO 8601 문자열) */
export function formatPublicDate(iso: string): string {
  return format(parseISO(iso), "yyyy.MM.dd (EEE)", { locale: ko });
}

export function formatPublicDateTime(iso: string): string {
  return format(parseISO(iso), "yyyy.MM.dd HH:mm", { locale: ko });
}

export function formatPublicPeriod(fromIso: string, toIso: string): string {
  return `${formatPublicDate(fromIso)} ~ ${formatPublicDate(toIso)}`;
}
