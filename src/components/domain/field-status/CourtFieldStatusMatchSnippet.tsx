"use client";

import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  getMatchDisplayStatus,
} from "@/lib/court-field-status-display";
import { cn } from "@/lib/utils";

export function CourtFieldStatusMatchSnippet({
  title,
  match,
  emptyText,
  emphasis = "default",
  className,
}: {
  title: string;
  match: OperationMatchRowVM | null;
  emptyText: string;
  emphasis?: "default" | "selected" | "muted" | "success";
  className?: string;
}) {
  if (!match) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed bg-muted/20 px-3 py-2.5",
          className,
        )}
      >
        <p className="text-muted-foreground text-[11px] font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{emptyText}</p>
      </div>
    );
  }

  const displayStatus = getMatchDisplayStatus(match);
  const emphasisClass =
    emphasis === "selected"
      ? "border-primary/40 bg-primary/5"
      : emphasis === "success"
        ? "border-emerald-300/50 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
        : emphasis === "muted"
          ? "border-border/70 bg-muted/20"
          : "border-border bg-card";

  return (
    <div className={cn("rounded-md border px-3 py-2.5", emphasisClass, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium">{title}</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">
            {match.orderLabel}
          </p>
        </div>
        <MatchonStatusBadge status={displayStatus} size="sm" />
      </div>

      <div className="mt-2 space-y-2">
        {match.division ? (
          <DivisionCompactDisplay
            division={match.division}
            mainClassName="text-[11px]"
            secondaryClassName="text-[10px]"
          />
        ) : (
          <p className="text-[11px] font-medium">
            {match.divisionLabel ?? "경기구분 미상"}
          </p>
        )}
        <OperationMatchFighterMatchup
          fighterRed={match.fighterRed}
          fighterBlue={match.fighterBlue}
          winnerId={match.winnerId}
          identityMode="wrap"
        />
      </div>
    </div>
  );
}
