import { BracketMatchStatus } from "@/lib/enums";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getOperationMatchPhase,
  operationPhaseLabel,
  type OperationMatchPhase,
} from "@/lib/match-operation-display";
import { getSelectableListCardClass } from "@/lib/ui/selectable-list-card";
import { resolveMatchStatusTone, type MatchStatusTone } from "@/lib/ui/match-status-ui";
import { cn } from "@/lib/utils";

export type OperationMatchListDisplay = {
  matchNumberLabel: string;
  courtLabel: string | null;
  divisionLabel: string;
  matchupLabel: string;
  /** 승자: 이름 | 결과 미입력 | 특수 결과 | 경기취소 */
  resultLabel: string;
  winnerName: string | null;
  hasWinner: boolean;
  statusLabel: string;
  statusTone: MatchStatusTone;
  phase: OperationMatchPhase;
  /** 화면상 경기종료 (status finished 또는 공식 결과) — DB 미변경 */
  isFinished: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  cardToneClassName: string;
  badgeClassName: string;
};

function formatMatchup(row: OperationMatchRowVM): string {
  const red = row.fighterRed?.name?.trim() || "미배정";
  const blue = row.fighterBlue?.name?.trim() || "미배정";
  return `${red} VS ${blue}`;
}

function resolveWinnerName(row: OperationMatchRowVM): string | null {
  if (!row.winnerId) return null;
  if (row.fighterRed?.id === row.winnerId) {
    return row.fighterRed.name?.trim() || null;
  }
  if (row.fighterBlue?.id === row.winnerId) {
    return row.fighterBlue.name?.trim() || null;
  }
  return null;
}

/**
 * 목록·상세 공통: 승패/공식 결과가 있으면 경기종료로 표시.
 * DB status는 변경하지 않는다.
 */
export function isOperationMatchFinishedDisplay(
  row: Pick<OperationMatchRowVM, "status" | "hasOfficialResults">,
): boolean {
  return (
    row.status === BracketMatchStatus.finished || Boolean(row.hasOfficialResults)
  );
}

function formatResultLabel(row: OperationMatchRowVM): {
  resultLabel: string;
  winnerName: string | null;
} {
  if (row.status === BracketMatchStatus.cancelled) {
    return { resultLabel: "경기취소", winnerName: null };
  }

  const winnerName = resolveWinnerName(row);
  if (winnerName) {
    return { resultLabel: `승자: ${winnerName}`, winnerName };
  }

  if (row.hasOfficialResults) {
    const special = row.resultType?.trim();
    if (special) {
      return { resultLabel: special, winnerName: null };
    }
    return { resultLabel: "경기종료", winnerName: null };
  }

  return { resultLabel: "결과 미입력", winnerName: null };
}

/** 상태별 카드 배경·border (selected 제외) */
export function getOperationMatchListToneClassName(
  phase: OperationMatchPhase,
): string {
  switch (phase) {
    case "preparing":
      return "border-[#F59E0B] bg-[#FFFBEB] hover:bg-[#FEF3C7]";
    case "in_progress":
      return "border-[#3B82F6] bg-[#EFF6FF] hover:bg-[#DBEAFE]";
    case "finished":
    case "result_done":
      return "border-[#CBD5E1] bg-[#F1F5F9] text-slate-700 hover:bg-[#E8EEF4]";
    case "cancelled":
      return "border-[#FB7185] bg-[#FFF1F2] hover:bg-[#FFE4E6]";
    default:
      return "border-[#E2E8F0] bg-white hover:border-matchon-primary/30 hover:bg-matchon-primary-light/20";
  }
}

export function getOperationMatchListCardToneClass(
  phase: OperationMatchPhase,
  selected: boolean,
): string {
  return getSelectableListCardClass({
    selected,
    toneClassName: getOperationMatchListToneClassName(phase),
  });
}

export function getOperationMatchListBadgeClass(phase: OperationMatchPhase): string {
  switch (phase) {
    case "preparing":
      return "border-amber-400 bg-amber-100 text-amber-900";
    case "in_progress":
      return "border-sky-400 bg-sky-100 text-sky-900";
    case "finished":
    case "result_done":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "cancelled":
      return "border-rose-300 bg-rose-100 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function getOperationMatchListDisplay(
  row: OperationMatchRowVM,
): OperationMatchListDisplay {
  const phase = getOperationMatchPhase(row);
  const statusTone = resolveMatchStatusTone(row.status);
  const isFinished = isOperationMatchFinishedDisplay(row);
  const isCancelled = phase === "cancelled";
  const { resultLabel, winnerName } = formatResultLabel(row);

  // 공식 결과가 있으면 phase가 result_done이어도 라벨은 경기종료로 통일
  const statusLabel = isFinished
    ? "경기종료"
    : isCancelled
      ? "경기취소"
      : operationPhaseLabel(phase);

  return {
    matchNumberLabel: row.orderLabel,
    courtLabel: row.courtName?.trim() || null,
    divisionLabel: row.divisionLabel ?? "경기구분 미상",
    matchupLabel: formatMatchup(row),
    resultLabel,
    winnerName,
    hasWinner: Boolean(winnerName),
    statusLabel,
    statusTone,
    phase,
    isFinished,
    isCompleted: isFinished,
    isCancelled,
    cardToneClassName: getOperationMatchListToneClassName(phase),
    badgeClassName: getOperationMatchListBadgeClass(phase),
  };
}

export function getOperationMatchListResultClassName(
  display: Pick<
    OperationMatchListDisplay,
    "hasWinner" | "isFinished" | "isCancelled"
  >,
): string {
  if (display.hasWinner) {
    return cn("truncate text-sm font-bold text-slate-900");
  }
  if (display.isFinished) {
    return "truncate text-xs font-medium text-slate-600";
  }
  if (display.isCancelled) {
    return "truncate text-xs font-medium text-rose-800";
  }
  return "truncate text-xs text-matchon-text-secondary";
}
