"use client";

import { ChevronRight } from "lucide-react";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import {
  organizerOperationMatchListItemActiveClass,
  organizerOperationMatchListItemClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

function formatFighterVs(row: OperationMatchRowVM): string {
  const red = row.fighterRed?.name?.trim() || "미배정";
  const blue = row.fighterBlue?.name?.trim() || "미배정";
  return `${red} vs ${blue}`;
}

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
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row) => {
        const selected = row.matchId === selectedMatchId;
        return (
          <button
            key={row.matchId}
            type="button"
            onClick={() => onSelectMatch(row.matchId)}
            className={cn(
              organizerOperationMatchListItemClass,
              selected && organizerOperationMatchListItemActiveClass,
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-matchon-text-primary">
                  {row.orderLabel}
                </span>
                {row.courtName ? (
                  <span className="text-matchon-text-secondary truncate text-xs">
                    {row.courtName}
                  </span>
                ) : null}
              </div>
              {row.division ? (
                <DivisionCompactDisplay
                  division={row.division}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
              ) : (
                <p className="truncate text-xs font-medium">
                  {row.divisionLabel ?? "경기구분 미상"}
                </p>
              )}
              <p
                className="truncate text-xs text-matchon-text-secondary"
                title={formatFighterVs(row)}
              >
                {formatFighterVs(row)}
              </p>
              <OrganizerOperationStatusBadges
                phase={getOperationMatchPhase(row)}
                phaseLabel={row.phaseLabel}
                resultStatusLabel={row.resultStatusLabel}
                status={row.status}
                size="sm"
                className="justify-start"
              />
            </div>
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-matchon-text-secondary",
                selected && "text-matchon-primary",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
