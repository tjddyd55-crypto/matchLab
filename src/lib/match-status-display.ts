import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { BracketMatchStatus } from "@/lib/enums";
import type { OperationMatchPhase } from "@/lib/match-operation-display";

/** shadcn Badge variant — 경기상태 전용 variant 포함 */
export type MatchStatusBadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

/** 경기 상태 라벨 SSOT (주최·운영·관람 공통) */
export const BRACKET_MATCH_STATUS_LABELS: Record<BracketMatchStatus, string> = {
  [BracketMatchStatus.waiting]: "대기",
  [BracketMatchStatus.called]: "경기준비",
  [BracketMatchStatus.ongoing]: "경기진행중",
  [BracketMatchStatus.finished]: "경기종료",
  [BracketMatchStatus.delayed]: "지연",
  [BracketMatchStatus.cancelled]: "경기취소",
};

export function bracketMatchStatusLabel(status: BracketMatchStatus): string {
  return BRACKET_MATCH_STATUS_LABELS[status] ?? String(status);
}

/** BracketMatchStatus → Badge variant (색·배경·보더는 badge.tsx SSOT) */
export function bracketMatchStatusBadgeVariant(
  status: BracketMatchStatus,
): MatchStatusBadgeVariant {
  switch (status) {
    case BracketMatchStatus.called:
      return "matchReady";
    case BracketMatchStatus.ongoing:
      return "matchInProgress";
    case BracketMatchStatus.finished:
      return "matchFinished";
    case BracketMatchStatus.cancelled:
      return "matchCancelled";
    case BracketMatchStatus.delayed:
      return "matchDelayed";
    case BracketMatchStatus.waiting:
    default:
      return "matchWaiting";
  }
}

/** 경기운영 phase → 동일 상태 색상 체계 */
export function operationPhaseBadgeVariant(
  phase: OperationMatchPhase,
): MatchStatusBadgeVariant {
  switch (phase) {
    case "preparing":
      return "matchReady";
    case "in_progress":
      return "matchInProgress";
    case "finished":
    case "result_done":
      return "matchFinished";
    case "cancelled":
      return "matchCancelled";
    case "scheduled":
    default:
      return "matchWaiting";
  }
}

/** 상태 배지 공통 크기·패딩 (대진표·운영·관람) */
export const matchStatusBadgeTypography =
  "h-auto min-h-6 shrink-0 px-3 py-1 text-xs font-semibold sm:text-sm";
