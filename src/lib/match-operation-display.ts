import { BracketMatchStatus } from "@/lib/enums";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";

export type OperationBoardFilter =
  | "all"
  | "scheduled"
  | "preparing"
  | "in_progress"
  | "completed"
  | "result_pending"
  | "result_done";

export type OperationMatchPhase =
  | "scheduled"
  | "preparing"
  | "in_progress"
  | "finished"
  | "result_done"
  | "cancelled";

export type OperationBoardSummary = {
  total: number;
  scheduled: number;
  preparing: number;
  inProgress: number;
  completed: number;
};

export function getOperationMatchPhase(
  match: Pick<
    OrganizerEventMatchListItemVM,
    "status" | "hasOfficialResults"
  >,
): OperationMatchPhase {
  if (match.status === BracketMatchStatus.cancelled) return "cancelled";
  if (match.hasOfficialResults) return "result_done";
  if (match.status === BracketMatchStatus.ongoing) return "in_progress";
  if (match.status === BracketMatchStatus.called) return "preparing";
  if (match.status === BracketMatchStatus.finished) return "finished";
  return "scheduled";
}

export function operationPhaseLabel(phase: OperationMatchPhase): string {
  switch (phase) {
    case "scheduled":
      return "대기";
    case "preparing":
      return "경기준비";
    case "in_progress":
      return "경기진행중";
    case "finished":
      return "경기종료";
    case "result_done":
      return "결과 입력 완료";
    case "cancelled":
      return "경기취소";
  }
}

export function operationResultStatusLabel(
  match: Pick<OrganizerEventMatchListItemVM, "hasOfficialResults" | "status">,
): string {
  if (match.status === BracketMatchStatus.cancelled) return "—";
  return match.hasOfficialResults ? "결과 입력 완료" : "결과 미입력";
}

export function summarizeOperationBoard(
  matches: OrganizerEventMatchListItemVM[],
): OperationBoardSummary {
  let scheduled = 0;
  let preparing = 0;
  let inProgress = 0;
  let completed = 0;

  for (const match of matches) {
    const phase = getOperationMatchPhase(match);
    if (phase === "scheduled") scheduled += 1;
    if (phase === "preparing") preparing += 1;
    if (phase === "in_progress") inProgress += 1;
    if (phase === "finished" || phase === "result_done") completed += 1;
  }

  return {
    total: matches.length,
    scheduled,
    preparing,
    inProgress,
    completed,
  };
}

export function matchesOperationBoardFilter(
  match: OrganizerEventMatchListItemVM,
  filter: OperationBoardFilter,
): boolean {
  if (filter === "all") return true;

  const phase = getOperationMatchPhase(match);

  switch (filter) {
    case "scheduled":
      return phase === "scheduled";
    case "preparing":
      return phase === "preparing";
    case "in_progress":
      return phase === "in_progress";
    case "completed":
      return phase === "finished" || phase === "result_done";
    case "result_pending":
      return (
        match.status === BracketMatchStatus.finished && !match.hasOfficialResults
      );
    case "result_done":
      return match.hasOfficialResults;
    default:
      return true;
  }
}

export function matchesOperationSearchQuery(
  match: OrganizerEventMatchListItemVM,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    match.divisionLabel,
    match.fighterRed?.name,
    match.fighterBlue?.name,
    match.fighterRed?.gymName,
    match.fighterBlue?.gymName,
    match.bracketTitle,
    match.roundName,
    match.resultMemo,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function formatOperationMatchOrder(
  match: Pick<
    OrganizerEventMatchListItemVM,
    "matchNumber" | "globalMatchOrder" | "matchOrder"
  >,
): string {
  return formatMatchOrderShort(match);
}

/** 다음 단계 상태 (한 번에 1단계만 진행) */
export function getNextStatusForOperationStart(
  status: BracketMatchStatus,
): BracketMatchStatus | null {
  if (status === BracketMatchStatus.waiting) return BracketMatchStatus.called;
  if (status === BracketMatchStatus.called) return BracketMatchStatus.ongoing;
  if (status === BracketMatchStatus.delayed) return BracketMatchStatus.ongoing;
  return null;
}

/** 진행 시작 시 필요한 상태 전이 순서 (기존 상태머신 준수) */
export function getStatusesForStartMatch(
  status: BracketMatchStatus,
): BracketMatchStatus[] {
  const next = getNextStatusForOperationStart(status);
  return next ? [next] : [];
}

export function canStartMatch(status: BracketMatchStatus): boolean {
  return getNextStatusForOperationStart(status) === BracketMatchStatus.ongoing;
}

export function canPrepareMatch(status: BracketMatchStatus): boolean {
  return status === BracketMatchStatus.waiting;
}

export function canEndMatch(status: BracketMatchStatus): boolean {
  return status === BracketMatchStatus.ongoing;
}

export function canEnterResult(
  match: Pick<
    OrganizerEventMatchListItemVM,
    "status" | "hasOfficialResults" | "fighterRed" | "fighterBlue"
  >,
): boolean {
  if (match.status === BracketMatchStatus.cancelled) return false;
  if (match.hasOfficialResults) return false;
  if (!match.fighterRed?.id || !match.fighterBlue?.id) return false;
  return match.status === BracketMatchStatus.finished;
}

export function canViewResult(
  match: Pick<OrganizerEventMatchListItemVM, "hasOfficialResults">,
): boolean {
  return match.hasOfficialResults;
}
