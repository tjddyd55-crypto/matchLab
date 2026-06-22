"use client";

import { Badge } from "@/components/ui/badge";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import {
  matchStatusBadgeTypography,
  operationPhaseBadgeVariant,
} from "@/lib/match-status-display";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";
import { cn } from "@/lib/utils";

export function StaffMatchStatusBadges({
  match,
  className,
}: {
  match: StaffEventMatchListItemVM;
  className?: string;
}) {
  const phase = getOperationMatchPhase(match);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge
        variant={operationPhaseBadgeVariant(phase)}
        className={matchStatusBadgeTypography}
      >
        {match.phaseLabel}
      </Badge>
      <Badge
        variant={
          match.resultDisplayStatus === "confirmed" ||
          match.resultDisplayStatus === "corrected"
            ? "matchFinished"
            : match.resultDisplayStatus === "voided"
              ? "matchCancelled"
              : "outline"
        }
        className={matchStatusBadgeTypography}
      >
        {match.resultDisplayLabel}
      </Badge>
    </div>
  );
}
