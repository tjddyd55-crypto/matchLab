import { BracketMatchStatus, MatchRecordStatus } from "@/lib/enums";
import {
  formatOperationMatchOrder,
  getOperationMatchPhase,
  operationPhaseLabel,
} from "@/lib/match-operation-display";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";

export type StaffResultDisplayStatus =
  | "pending"
  | "draft"
  | "confirmed"
  | "corrected"
  | "voided";

export type StaffBoardFilter =
  | "all"
  | "in_progress"
  | "result_pending"
  | "result_done";

export type StaffBoardSummary = {
  total: number;
  inProgress: number;
  resultPending: number;
  completed: number;
};

export type StaffEventMatchListItemVM = OrganizerEventMatchListItemVM & {
  orderLabel: string;
  phaseLabel: string;
  resultDisplayStatus: StaffResultDisplayStatus;
  resultDisplayLabel: string;
};

export function staffResultDisplayLabel(status: StaffResultDisplayStatus): string {
  switch (status) {
    case "pending":
      return "결과 미입력";
    case "draft":
      return "임시 입력";
    case "confirmed":
      return "확정";
    case "corrected":
      return "정정됨";
    case "voided":
      return "무효";
  }
}

export function resolveStaffResultDisplayStatus(input: {
  hasOfficialResults: boolean;
  winnerId: string | null;
  resultType: OrganizerEventMatchListItemVM["resultType"];
  resultMemo: string | null;
  matchResultStatuses: MatchRecordStatus[];
}): StaffResultDisplayStatus {
  const statuses = input.matchResultStatuses;
  if (statuses.includes(MatchRecordStatus.voided)) {
    return "voided";
  }
  if (input.hasOfficialResults) {
    if (statuses.includes(MatchRecordStatus.corrected)) {
      return "corrected";
    }
    return "confirmed";
  }
  if (input.winnerId || input.resultType || input.resultMemo?.trim()) {
    return "draft";
  }
  return "pending";
}

export function toStaffEventMatchRow(
  match: OrganizerEventMatchListItemVM & {
    matchResultStatuses?: MatchRecordStatus[];
  },
): StaffEventMatchListItemVM {
  const phase = getOperationMatchPhase(match);
  const resultDisplayStatus = resolveStaffResultDisplayStatus({
    hasOfficialResults: match.hasOfficialResults,
    winnerId: match.winnerId,
    resultType: match.resultType,
    resultMemo: match.resultMemo,
    matchResultStatuses: match.matchResultStatuses ?? [],
  });

  return {
    ...match,
    orderLabel: formatOperationMatchOrder(match),
    phaseLabel: operationPhaseLabel(phase),
    resultDisplayStatus,
    resultDisplayLabel: staffResultDisplayLabel(resultDisplayStatus),
  };
}

export function summarizeStaffBoard(
  matches: StaffEventMatchListItemVM[],
): StaffBoardSummary {
  let inProgress = 0;
  let resultPending = 0;
  let completed = 0;

  for (const match of matches) {
    if (match.status === BracketMatchStatus.ongoing) inProgress += 1;
    if (!match.hasOfficialResults && match.status !== BracketMatchStatus.cancelled) {
      resultPending += 1;
    }
    if (match.hasOfficialResults) completed += 1;
  }

  return {
    total: matches.length,
    inProgress,
    resultPending,
    completed,
  };
}

export function matchesStaffBoardFilter(
  match: StaffEventMatchListItemVM,
  filter: StaffBoardFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "in_progress") {
    return match.status === BracketMatchStatus.ongoing;
  }
  if (filter === "result_pending") {
    return !match.hasOfficialResults && match.status !== BracketMatchStatus.cancelled;
  }
  if (filter === "result_done") {
    return match.hasOfficialResults;
  }
  return true;
}

export function matchesStaffSearchQuery(
  match: StaffEventMatchListItemVM,
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
    match.orderLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function staffPermissionSummary(link: {
  canChangeMatchStatus: boolean;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
  label: string;
}): string {
  const parts: string[] = [];
  if (link.canRecordOutcomeDraft) parts.push("임시 입력");
  if (link.canConfirmResult) parts.push("결과 확정");
  if (link.canChangeMatchStatus) parts.push("상태 변경");
  return parts.length ? parts.join(" · ") : "조회만";
}
