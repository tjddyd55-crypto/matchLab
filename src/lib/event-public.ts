import type { EventStatus } from "@/lib/enums";

/** 공개 목록·홈에서 사용하는 진행 구간 구분 */
export function isPublicEventInProgress(status: EventStatus): boolean {
  return status === "bracket_ready" || status === "ongoing";
}
