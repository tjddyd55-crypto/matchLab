"use client";

import { OrganizerOperationActions } from "@/components/domain/operation/OrganizerOperationActions";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";

export function OrganizerOperationCardListMobile({
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
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm md:hidden">
        표시할 경기가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {rows.map((row) => (
        <article
          key={row.matchId}
          className="ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs">
                경기 {row.orderLabel}
              </p>
              <p className="font-medium">{row.divisionLabel ?? "경기구분 미상"}</p>
              <p className="text-muted-foreground text-xs">{row.bracketTitle}</p>
            </div>
            <OrganizerOperationStatusBadges
              phase={getOperationMatchPhase(row)}
              phaseLabel={row.phaseLabel}
              resultStatusLabel={row.resultStatusLabel}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">선수 A</p>
              <p className="font-medium">{row.fighterRed?.name ?? "—"}</p>
              <p className="text-muted-foreground text-xs">
                {row.fighterRed?.gymName ?? "—"}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">선수 B</p>
              <p className="font-medium">{row.fighterBlue?.name ?? "—"}</p>
              <p className="text-muted-foreground text-xs">
                {row.fighterBlue?.gymName ?? "—"}
              </p>
            </div>
          </div>

          <OrganizerOperationActions
            match={row}
            onOpenResult={() => onOpenResult(row)}
            onOpenView={() => onOpenView(row)}
          />
        </article>
      ))}
    </div>
  );
}
