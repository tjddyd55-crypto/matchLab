"use client";

import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import { resolveOperationDisplayStatus } from "@/lib/ui/matchon-status";
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
      <Card variant="muted" className={cn("py-4", className)}>
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground px-4 pt-2 text-xs">
          해당 경기가 없습니다.
        </CardContent>
      </Card>
    );
  }

  const phase = getOperationMatchPhase(match);
  const displayStatus = resolveOperationDisplayStatus({
    status: match.status,
    phase,
  });
  const cardVariant = selected ? "selected" : variant;

  return (
    <Card
      variant={cardVariant}
      className={cn(
        onSelect && "cursor-pointer",
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
      <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 py-0">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <CardTitle className="text-base leading-snug">
            {match.orderLabel}
            {match.courtName ? (
              <span className="text-muted-foreground ml-1 text-sm font-normal">
                · {match.courtName}
              </span>
            ) : null}
          </CardTitle>
        </div>
        <MatchonStatusBadge status={displayStatus} size="sm" />
      </CardHeader>
      <CardContent className="space-y-3 px-4 pt-2">
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
      </CardContent>
    </Card>
  );
}
