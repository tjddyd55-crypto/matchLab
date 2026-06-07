import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import type { OrganizerMatchOpsPanelProps } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import {
  formatOperationMatchOrder,
  getOperationMatchPhase,
  operationPhaseLabel,
  operationResultStatusLabel,
} from "@/lib/match-operation-display";

export type OperationMatchRowVM = OrganizerEventMatchListItemVM & {
  orderLabel: string;
  phaseLabel: string;
  resultStatusLabel: string;
};

export function toOperationMatchRow(
  match: OrganizerEventMatchListItemVM,
): OperationMatchRowVM {
  return {
    ...match,
    orderLabel: formatOperationMatchOrder(match),
    phaseLabel: operationPhaseLabel(getOperationMatchPhase(match)),
    resultStatusLabel: operationResultStatusLabel(match),
  };
}

export function toMatchOpsProps(
  row: OrganizerEventMatchListItemVM,
): OrganizerMatchOpsPanelProps {
  return {
    bracketType: row.bracketType,
    matchId: row.matchId,
    status: row.status,
    fighterRedId: row.fighterRed?.id ?? null,
    fighterBlueId: row.fighterBlue?.id ?? null,
    fighterRedName: row.fighterRed?.name ?? "미배정",
    fighterBlueName: row.fighterBlue?.name ?? "미배정",
    hasOfficialResults: row.hasOfficialResults,
    winnerId: row.winnerId,
    resultType: row.resultType,
    resultMemo: row.resultMemo,
  };
}
