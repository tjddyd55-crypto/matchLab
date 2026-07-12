import { BracketMatchStatus } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { getBracketMatchStatusLabel } from "@/lib/ui/match-status-ui";

/** 대진표 경기 상태 → MatchonStatusBadge (운영자·공개 공통) */
export function resolveBracketMatchMatchonStatus(
  status: BracketMatchStatus,
): MatchonStatus {
  switch (status) {
    case BracketMatchStatus.ongoing:
      return "in_progress";
    case BracketMatchStatus.finished:
      return "completed";
    case BracketMatchStatus.cancelled:
      return "cancelled";
    case BracketMatchStatus.waiting:
    case BracketMatchStatus.called:
    default:
      return "waiting";
  }
}

export function getBracketMatchMatchonLabel(
  status: BracketMatchStatus,
): string {
  if (status === BracketMatchStatus.ongoing) return "진행중";
  return getBracketMatchStatusLabel(status);
}
