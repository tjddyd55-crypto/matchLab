import type { CourtTabId } from "@/lib/court-tab-label";
import {
  type CourtSortRef,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import { BracketMatchStatus } from "@/lib/enums";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";

export type OperationSpotlightMatches<T extends { status: BracketMatchStatus }> = {
  current: T | null;
  next: T | null;
  recentFinished: T | null;
};

/** 경기장 탭 기준 현재/다음/최근 종료 경기 */
export function pickOperationSpotlightMatches<
  T extends { status: BracketMatchStatus },
>(rows: T[]): OperationSpotlightMatches<T> {
  const ongoingIdx = rows.findIndex((r) => r.status === BracketMatchStatus.ongoing);
  const current =
    ongoingIdx >= 0
      ? rows[ongoingIdx]
      : rows.find((r) => r.status === BracketMatchStatus.called) ?? null;

  const startIdx =
    ongoingIdx >= 0 ? ongoingIdx + 1 : current ? rows.indexOf(current) + 1 : 0;

  const next =
    rows.slice(startIdx).find(
      (r) =>
        r.status === BracketMatchStatus.waiting ||
        r.status === BracketMatchStatus.called,
    ) ??
    rows.find(
      (r) =>
        r !== current &&
        (r.status === BracketMatchStatus.waiting ||
          r.status === BracketMatchStatus.called),
    ) ??
    null;

  const terminal = rows.filter(
    (r) =>
      r.status === BracketMatchStatus.finished ||
      r.status === BracketMatchStatus.cancelled,
  );
  const recentFinished =
    terminal.length > 0 ? terminal[terminal.length - 1] : null;

  return { current, next, recentFinished };
}

export type OperationOrderFields = Pick<
  OrganizerEventMatchListItemVM,
  | "matchId"
  | "courtId"
  | "courtOrder"
  | "matchNumber"
  | "globalMatchOrder"
  | "matchOrder"
>;

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
  resultPending: number;
  resultDone: number;
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
    case "result_done":
      // 공식 결과 존재(result_done)도 사용자에게는 경기종료로 통일
      return "경기종료";
    case "cancelled":
      return "경기취소";
  }
}

/**
 * 결과 보조 문구. 공식 결과가 있으면 빈 문자열(목록/배지에서 숨김).
 * `결과 입력 완료`는 사용하지 않는다.
 */
export function operationResultStatusLabel(
  match: Pick<OrganizerEventMatchListItemVM, "hasOfficialResults" | "status">,
): string {
  if (match.status === BracketMatchStatus.cancelled) return "—";
  if (match.hasOfficialResults) return "";
  return "결과 미입력";
}

export function summarizeOperationBoard(
  matches: OrganizerEventMatchListItemVM[],
): OperationBoardSummary {
  let scheduled = 0;
  let preparing = 0;
  let inProgress = 0;
  let completed = 0;
  let resultPending = 0;
  let resultDone = 0;

  for (const match of matches) {
    const phase = getOperationMatchPhase(match);
    if (phase === "scheduled") scheduled += 1;
    if (phase === "preparing") preparing += 1;
    if (phase === "in_progress") inProgress += 1;
    if (phase === "finished" || phase === "result_done") completed += 1;
    if (
      match.status === BracketMatchStatus.finished &&
      !match.hasOfficialResults
    ) {
      resultPending += 1;
    }
    if (match.hasOfficialResults) {
      resultDone += 1;
    }
  }

  return {
    total: matches.length,
    scheduled,
    preparing,
    inProgress,
    completed,
    resultPending,
    resultDone,
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

function compareOperationOrderTieBreak(
  a: OperationOrderFields,
  b: OperationOrderFields,
): number {
  const keyA =
    a.matchNumber ?? a.globalMatchOrder ?? a.matchOrder ?? Number.MAX_SAFE_INTEGER;
  const keyB =
    b.matchNumber ?? b.globalMatchOrder ?? b.matchOrder ?? Number.MAX_SAFE_INTEGER;
  if (keyA !== keyB) return keyA - keyB;
  return a.matchId.localeCompare(b.matchId);
}

function compareSingleCourtOperationRows(
  a: OperationOrderFields,
  b: OperationOrderFields,
): number {
  const orderA = a.courtOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.courtOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return compareOperationOrderTieBreak(a, b);
}

/** 경기 운영 화면 — courtTab 기준 정렬 */
export function sortOperationMatchRows<T extends OperationOrderFields>(
  rows: T[],
  courtTab: CourtTabId,
  courts: CourtSortRef[],
): T[] {
  if (courtTab !== "all") {
    return [...rows].sort(compareSingleCourtOperationRows);
  }
  return sortMatchesByCourtSchedule(rows, courts);
}

/**
 * 경기 운영 화면 순서 라벨.
 * 경기장 탭: courtOrder. 전체 탭: 기존 matchNumber/globalMatchOrder fallback.
 */
export function formatOperationOrderLabel(
  match: OperationOrderFields,
  courtTab: CourtTabId,
): string {
  if (courtTab !== "all" && match.courtOrder != null) {
    return `${match.courtOrder}경기`;
  }
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

export type CourtQueueMatchRef = {
  matchId: string;
  status: BracketMatchStatus;
  hasOfficialResults?: boolean;
};

/**
 * 같은 경기장 courtOrder 정렬 목록에서 spotlight.current 이후 target 직전까지
 * 운영 큐(scheduled/preparing/in_progress) 경기 수 — matchNumber 차감과 무관.
 */
export function countQueueMatchesUntilTarget<T extends CourtQueueMatchRef>(
  rows: T[],
  targetMatchId: string,
): number {
  const targetIdx = rows.findIndex((row) => row.matchId === targetMatchId);
  if (targetIdx < 0) return 0;

  const spotlight = pickOperationSpotlightMatches(rows);
  const currentIdx = spotlight.current
    ? rows.findIndex((row) => row.matchId === (spotlight.current as T).matchId)
    : -1;

  let count = 0;
  for (let i = Math.max(0, currentIdx + 1); i < targetIdx; i++) {
    const phase = getOperationMatchPhase({
      status: rows[i].status,
      hasOfficialResults: rows[i].hasOfficialResults ?? false,
    });
    if (
      phase === "scheduled" ||
      phase === "preparing" ||
      phase === "in_progress"
    ) {
      count += 1;
    }
  }
  return count;
}
