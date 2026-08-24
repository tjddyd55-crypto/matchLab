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
    <div className={cn("flex flex-col gap-1.5", className)} role="listbox">
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
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="min-w-0 text-sm font-semibold leading-tight text-matchon-text-primary">
                {display.matchNumberLabel}
                {display.courtLabel ? (
                  <span className="text-matchon-text-secondary ml-1 text-[12px] font-normal">
                    · {display.courtLabel}
                  </span>
                ) : null}
              </p>
              <span
                className={cn(
                  "inline-flex h-[22px] shrink-0 items-center rounded-md border px-1.5 text-[11px] font-semibold",
                  display.badgeClassName,
                )}
              >
                {display.statusLabel}
              </span>
            </div>
            {row.division ? (
              <DivisionCompactDisplay
                division={row.division}
                mainClassName="text-[11px] leading-tight"
                secondaryClassName="text-[10px] leading-tight"
              />
            ) : (
              <p className="truncate text-[11px] font-medium leading-tight">
                {display.divisionLabel}
              </p>
            )}
            <p
              className={cn(
                "truncate text-sm font-semibold leading-snug",
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
