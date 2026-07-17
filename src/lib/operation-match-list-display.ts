import { BracketMatchStatus } from "@/lib/enums";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getOperationMatchPhase,
  operationPhaseLabel,
  operationResultStatusLabel,
  type OperationMatchPhase,
} from "@/lib/match-operation-display";
import { resolveMatchStatusTone, type MatchStatusTone } from "@/lib/ui/match-status-ui";
import { cn } from "@/lib/utils";

export type OperationMatchListDisplay = {
  matchNumberLabel: string;
  courtLabel: string | null;
  divisionLabel: string;
  matchupLabel: string;
  resultLabel: string;
  statusLabel: string;
  statusTone: MatchStatusTone;
  phase: OperationMatchPhase;
  isCompleted: boolean;
  isCancelled: boolean;
  cardClassName: string;
  badgeClassName: string;
};

function formatMatchup(row: OperationMatchRowVM): string {
  const red = row.fighterRed?.name?.trim() || "미배정";
  const blue = row.fighterBlue?.name?.trim() || "미배정";
  return `${red} VS ${blue}`;
}

function formatResult(row: OperationMatchRowVM): string {
  if (row.status === BracketMatchStatus.cancelled) return "경기취소";
  if (row.hasOfficialResults) {
    const winner =
      row.winnerId && row.fighterRed?.id === row.winnerId
        ? row.fighterRed.name
        : row.winnerId && row.fighterBlue?.id === row.winnerId
          ? row.fighterBlue.name
          : null;
    return winner ? `승자: ${winner}` : "결과 입력 완료";
  }
  return operationResultStatusLabel(row);
}

/** 목록 카드 배경·보더 — 상태별 즉시 구분 */
export function getOperationMatchListCardToneClass(
  phase: OperationMatchPhase,
  selected: boolean,
): string {
  const base =
    "flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors";
  const selectedRing = selected
    ? "ring-2 ring-matchon-primary ring-offset-1"
    : "";

  switch (phase) {
    case "preparing":
      return cn(
        base,
        selectedRing,
        "border-amber-300 bg-amber-50 hover:bg-amber-50/90",
      );
    case "in_progress":
      return cn(
        base,
        selectedRing,
        "border-sky-400 bg-sky-50 hover:bg-sky-50/90",
      );
    case "finished":
    case "result_done":
      return cn(
        base,
        selectedRing,
        "border-slate-200 bg-[#F1F5F9] text-slate-700 hover:bg-[#E8EEF4]",
      );
    case "cancelled":
      return cn(
        base,
        selectedRing,
        "border-rose-300 bg-rose-50 hover:bg-rose-50/90",
      );
    default:
      return cn(
        base,
        selectedRing,
        "border-matchon-border bg-white hover:border-matchon-primary/30 hover:bg-matchon-primary-light/20",
      );
  }
}

export function getOperationMatchListBadgeClass(phase: OperationMatchPhase): string {
  switch (phase) {
    case "preparing":
      return "border-amber-400 bg-amber-100 text-amber-900";
    case "in_progress":
      return "border-sky-400 bg-sky-100 text-sky-900";
    case "finished":
    case "result_done":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
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
  const isCompleted = phase === "finished" || phase === "result_done";
  const isCancelled = phase === "cancelled";

  return {
    matchNumberLabel: row.orderLabel,
    courtLabel: row.courtName?.trim() || null,
    divisionLabel: row.divisionLabel ?? "경기구분 미상",
    matchupLabel: formatMatchup(row),
    resultLabel: formatResult(row),
    statusLabel: operationPhaseLabel(phase),
    statusTone,
    phase,
    isCompleted,
    isCancelled,
    cardClassName: "",
    badgeClassName: getOperationMatchListBadgeClass(phase),
  };
}
