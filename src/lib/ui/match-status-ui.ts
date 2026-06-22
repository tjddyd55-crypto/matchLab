import { BracketMatchStatus } from "@/lib/enums";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
import { type StatusBadgeVariant } from "@/lib/ui/status-badge-ui";

export type { StatusBadgeVariant } from "@/lib/ui/status-badge-ui";
export {
  statusBadgeSizeClasses,
  matchStatusBadgeSizeClasses,
  matchStatusBadgeTypography,
} from "@/lib/ui/status-badge-ui";

/** 화면용 경기 상태 톤 (semantic) */
export type MatchStatusTone =
  | "waiting"
  | "ready"
  | "ongoing"
  | "finished"
  | "cancelled"
  | "unknown";

/** @deprecated StatusBadgeVariant 사용 */
export type MatchStatusBadgeVariant = StatusBadgeVariant;

export type MatchStatusUiToken = {
  label: string;
  badgeVariant: MatchStatusBadgeVariant;
  dotClassName: string;
};

/**
 * 경기상태 색·라벨 SSOT
 * — 배경/텍스트/보더는 badge.tsx 의 match* variant 와 쌍으로 유지
 */
export const matchStatusUiTokens: Record<MatchStatusTone, MatchStatusUiToken> = {
  waiting: {
    label: "대기",
    badgeVariant: "matchWaiting",
    dotClassName: "bg-slate-400 dark:bg-slate-500",
  },
  ready: {
    label: "경기준비",
    badgeVariant: "matchReady",
    dotClassName: "bg-amber-500 dark:bg-amber-400",
  },
  ongoing: {
    label: "경기진행중",
    badgeVariant: "matchOngoing",
    dotClassName: "bg-primary-foreground",
  },
  finished: {
    label: "경기종료",
    badgeVariant: "matchFinished",
    dotClassName: "bg-emerald-100 dark:bg-emerald-200",
  },
  cancelled: {
    label: "경기취소",
    badgeVariant: "matchCancelled",
    dotClassName: "bg-rose-100 dark:bg-rose-200",
  },
  unknown: {
    label: "상태확인",
    badgeVariant: "matchUnknown",
    dotClassName: "bg-muted-foreground",
  },
};

const STATUS_ALIAS_TO_TONE: Record<string, MatchStatusTone> = {
  pending: "waiting",
  waiting: "waiting",
  scheduled: "waiting",
  called: "ready",
  ready: "ready",
  preparing: "ready",
  delayed: "ready",
  ongoing: "ongoing",
  in_progress: "ongoing",
  live: "ongoing",
  finished: "finished",
  completed: "finished",
  done: "finished",
  result_done: "finished",
  cancelled: "cancelled",
  canceled: "cancelled",
  stopped: "cancelled",
};

export function resolveMatchStatusTone(
  status: string | null | undefined,
): MatchStatusTone {
  if (!status) return "unknown";
  const key = status.toLowerCase().trim();
  return STATUS_ALIAS_TO_TONE[key] ?? "unknown";
}

export function resolveBracketMatchStatusTone(
  status: BracketMatchStatus,
): MatchStatusTone {
  switch (status) {
    case BracketMatchStatus.waiting:
      return "waiting";
    case BracketMatchStatus.called:
    case BracketMatchStatus.delayed:
      return "ready";
    case BracketMatchStatus.ongoing:
      return "ongoing";
    case BracketMatchStatus.finished:
      return "finished";
    case BracketMatchStatus.cancelled:
      return "cancelled";
    default:
      return "unknown";
  }
}

export function getMatchStatusLabel(
  status: string | BracketMatchStatus,
): string {
  if (
    typeof status === "string" &&
    (Object.values(BracketMatchStatus) as string[]).includes(status)
  ) {
    return getBracketMatchStatusLabel(status as BracketMatchStatus);
  }
  const tone = resolveMatchStatusTone(String(status));
  return matchStatusUiTokens[tone].label;
}

export function getBracketMatchStatusLabel(status: BracketMatchStatus): string {
  if (status === BracketMatchStatus.delayed) return "지연";
  return matchStatusUiTokens[resolveBracketMatchStatusTone(status)].label;
}

export function getMatchStatusBadgeVariant(
  status: string | BracketMatchStatus,
): MatchStatusBadgeVariant {
  const tone =
    typeof status === "string" &&
    (Object.values(BracketMatchStatus) as string[]).includes(status)
      ? resolveBracketMatchStatusTone(status as BracketMatchStatus)
      : resolveMatchStatusTone(String(status));
  return matchStatusUiTokens[tone].badgeVariant;
}

export function getMatchStatusDotClassName(
  status: string | BracketMatchStatus,
): string {
  const tone =
    typeof status === "string" &&
    (Object.values(BracketMatchStatus) as string[]).includes(status)
      ? resolveBracketMatchStatusTone(status as BracketMatchStatus)
      : resolveMatchStatusTone(String(status));
  return matchStatusUiTokens[tone].dotClassName;
}

export function operationPhaseToMatchStatusTone(
  phase: OperationMatchPhase,
): MatchStatusTone {
  return resolveMatchStatusTone(phase);
}

/** @deprecated getMatchStatusBadgeVariant 사용 */
export const bracketMatchStatusBadgeVariant = getMatchStatusBadgeVariant;

/** @deprecated getBracketMatchStatusLabel 사용 */
export const bracketMatchStatusLabel = getBracketMatchStatusLabel;

/** @deprecated operationPhaseToMatchStatusTone + getMatchStatusBadgeVariant 사용 */
export function operationPhaseBadgeVariant(
  phase: OperationMatchPhase,
): MatchStatusBadgeVariant {
  return getMatchStatusBadgeVariant(phase);
}

export const BRACKET_MATCH_STATUS_LABELS = Object.fromEntries(
  (Object.values(BracketMatchStatus) as BracketMatchStatus[]).map((s) => [
    s,
    getBracketMatchStatusLabel(s),
  ]),
) as Record<BracketMatchStatus, string>;
