"use client";

import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import { resolveOperationDisplayStatus } from "@/lib/ui/matchon-status";
import { organizerOperationVsCardClass } from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

export function OperationMatchHighlightCard({
  title,
  match,
  variant = "default",
  onSelect,
  selected,
  className,
}: {
  title: string;
  match: OperationMatchRowVM | null;
  variant?: "default" | "selected" | "muted" | "success" | "danger";
  onSelect?: (match: OperationMatchRowVM) => void;
  selected?: boolean;
  className?: string;
}) {
  if (!match) {
    return (
      <div
        className={cn(
          organizerOperationVsCardClass,
          "py-4 opacity-70",
          className,
        )}
      >
        <p className="text-matchon-text-secondary text-xs font-medium">{title}</p>
        <p className="text-matchon-text-secondary mt-2 text-xs">
          해당 경기가 없습니다.
        </p>
      </div>
    );
  }

  const phase = getOperationMatchPhase(match);
  const displayStatus = resolveOperationDisplayStatus({
    status: match.status,
    phase,
  });

  return (
    <div
      className={cn(
        organizerOperationVsCardClass,
        "cursor-pointer transition-shadow hover:shadow-md",
        selected && "border-matchon-primary ring-1 ring-matchon-primary/25",
        variant === "success" && !selected && "border-emerald-200",
        variant === "selected" && !selected && "border-matchon-primary/40",
        className,
      )}
      onClick={onSelect ? () => onSelect(match) : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(match);
              }
            }
          : undefined
      }
    >
      <div className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-matchon-text-secondary text-xs font-medium">
            {title}
          </p>
          <p className="text-base font-bold leading-snug text-matchon-text-primary">
            {match.orderLabel}
            {match.courtName ? (
              <span className="text-matchon-text-secondary ml-1 text-sm font-normal">
                · {match.courtName}
              </span>
            ) : null}
          </p>
        </div>
        <MatchonStatusBadge status={displayStatus} size="sm" />
      </div>
      <div className="mt-3 space-y-3">
        {match.division ? (
          <DivisionCompactDisplay
            division={match.division}
            mainClassName="text-xs"
            secondaryClassName="text-[11px]"
          />
        ) : (
          <p className="text-xs font-medium">
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
