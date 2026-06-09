"use client";

import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";

export function OrganizerOperationTableDesktop({
  rows,
  onOpenResult,
  onOpenView,
}: {
  rows: OperationMatchRowVM[];
  onOpenResult: (row: OperationMatchRowVM) => void;
  onOpenView: (row: OperationMatchRowVM) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
        표시할 경기가 없습니다.
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-xl border md:block">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">순서</th>
            <th className="px-3 py-2 font-medium">부문/체급</th>
            <th className="px-3 py-2 font-medium">선수 A</th>
            <th className="px-3 py-2 font-medium">선수 B</th>
            <th className="px-3 py-2 font-medium">심판</th>
            <th className="px-3 py-2 font-medium">경기 상태</th>
            <th className="px-3 py-2 font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.matchId} className="border-b align-top">
              <td className="px-3 py-3 font-mono text-xs">{row.orderLabel}</td>
              <td className="px-3 py-3 text-xs">
                <div className="font-medium">{row.divisionLabel ?? "—"}</div>
                <div className="text-muted-foreground">{row.bracketTitle}</div>
              </td>
              <td className="px-3 py-3 text-xs">
                <div className="font-medium">{row.fighterRed?.name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {row.fighterRed?.gymName ?? "—"}
                </div>
              </td>
              <td className="px-3 py-3 text-xs">
                <div className="font-medium">{row.fighterBlue?.name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {row.fighterBlue?.gymName ?? "—"}
                </div>
              </td>
              <td className="text-muted-foreground px-3 py-3 text-xs">
                {row.judgeSubmitLabel ?? "—"}
              </td>
              <td className="px-3 py-3">
                <OrganizerOperationStatusBadges
                  phase={getOperationMatchPhase(row)}
                  phaseLabel={row.phaseLabel}
                  resultStatusLabel={row.resultStatusLabel}
                />
              </td>
              <td className="px-3 py-3">
                <OrganizerOperationActions
                  match={row}
                  compact
                  onOpenResult={() => onOpenResult(row)}
                  onOpenView={() => onOpenView(row)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
