"use client";

import { useMemo, useState } from "react";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import {
  toMatchOpsProps,
  toOperationMatchRow,
  type OperationMatchRowVM,
} from "@/components/domain/operation/operation-match-row";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import {
  getOperationMatchPhase,
  sortOperationMatchRows,
} from "@/lib/match-operation-display";
import { getOperationMatchListDisplay } from "@/lib/operation-match-list-display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OnsiteOpsMatchOpsTab({
  matches,
  judgeSummaryByMatch = {},
}: {
  matches: OrganizerEventMatchListItemVM[];
  judgeSummaryByMatch?: Record<
    string,
    { assignedCount: number; submittedCount: number }
  >;
}) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const mapped = matches.map((m) =>
      toOperationMatchRow(m, judgeSummaryByMatch[m.matchId]),
    );
    return sortOperationMatchRows(mapped, "all", []);
  }, [matches, judgeSummaryByMatch]);

  const selectedRow = rows.find((r) => r.matchId === selectedMatchId) ?? null;

  if (selectedRow) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSelectedMatchId(null)}
        >
          경기 목록
        </Button>
        <OrganizerMatchOpsPanel
          {...toMatchOpsProps(selectedRow)}
          presentation="operation"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border px-4 py-8 text-center text-sm">
          표시할 경기가 없습니다.
        </p>
      ) : (
        rows.map((row) => (
          <MatchListCard
            key={row.matchId}
            row={row}
            onSelect={() => setSelectedMatchId(row.matchId)}
          />
        ))
      )}
    </div>
  );
}

function MatchListCard({
  row,
  onSelect,
}: {
  row: OperationMatchRowVM;
  onSelect: () => void;
}) {
  const display = getOperationMatchListDisplay(row);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-white p-3 text-left shadow-sm transition-colors",
        "hover:border-[#0A47FF]/40 active:bg-muted/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[#0F172A]">
            {display.matchNumberLabel}
            {display.courtLabel ? (
              <span className="text-muted-foreground ml-1 text-xs font-normal">
                · {display.courtLabel}
              </span>
            ) : null}
          </p>
          {row.division ? (
            <DivisionCompactDisplay
              division={row.division}
              mainClassName="text-[11px]"
              secondaryClassName="text-[10px]"
            />
          ) : (
            <p className="text-[11px] text-[#64748B]">
              {row.divisionLabel ?? "경기구분 미상"}
            </p>
          )}
          <p className="text-xs text-[#334155]">
            <span className="font-medium text-red-600">
              {row.fighterRed?.name ?? "—"}
            </span>
            <span className="text-muted-foreground mx-1">vs</span>
            <span className="font-medium text-blue-600">
              {row.fighterBlue?.name ?? "—"}
            </span>
          </p>
        </div>
        <OrganizerOperationStatusBadges
          phase={getOperationMatchPhase(row)}
          phaseLabel={row.phaseLabel}
          resultStatusLabel={row.resultStatusLabel}
          status={row.status}
          size="sm"
        />
      </div>
    </button>
  );
}
