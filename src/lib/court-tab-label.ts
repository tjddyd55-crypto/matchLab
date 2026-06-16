import type { EventCourtVM } from "@/lib/services/event-court.service";

/** 경기장 탭 라벨 — "1경기장", "2경기장" 형식 우선 */
export function formatCourtTabLabel(
  court: Pick<EventCourtVM, "name">,
  index: number,
): string {
  const trimmed = court.name.trim();
  if (/^\d+\s*경기장$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }
  if (/경기장/.test(trimmed)) {
    return trimmed;
  }
  return `${index + 1}경기장`;
}

export type CourtTabId = "all" | string;
