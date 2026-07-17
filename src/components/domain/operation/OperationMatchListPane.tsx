"use client";

import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getOperationMatchListCardToneClass,
  getOperationMatchListDisplay,
  getOperationMatchListResultClassName,
} from "@/lib/operation-match-list-display";
import { cn } from "@/lib/utils";

export function OperationMatchListPane({
  rows,
  selectedMatchId,
  onSelectMatch,
  className,
}: {
  rows: OperationMatchRowVM[];
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
        표시할 경기가 없습니다.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} role="listbox">
      {rows.map((row) => {
        const selected = row.matchId === selectedMatchId;
        const display = getOperationMatchListDisplay(row);
        return (
          <button
            key={row.matchId}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelectMatch(row.matchId)}
            className={getOperationMatchListCardToneClass(
              display.phase,
              selected,
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-matchon-text-primary">
                {display.matchNumberLabel}
                {display.courtLabel ? (
                  <span className="text-matchon-text-secondary font-medium">
                    {" "}
                    · {display.courtLabel}
                  </span>
                ) : null}
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                  display.badgeClassName,
                )}
              >
                {display.statusLabel}
              </span>
            </div>
            {row.division ? (
              <DivisionCompactDisplay
                division={row.division}
                mainClassName="text-xs"
                secondaryClassName="text-[11px]"
              />
            ) : (
              <p className="truncate text-xs font-medium">
                {display.divisionLabel}
              </p>
            )}
            <p
              className={cn(
                "truncate text-sm font-semibold",
                display.isFinished && "text-slate-600",
              )}
              title={display.matchupLabel}
            >
              {display.matchupLabel}
            </p>
            <p
              className={getOperationMatchListResultClassName(display)}
              title={display.resultLabel}
            >
              {display.resultLabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}
