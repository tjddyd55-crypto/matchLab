"use client";

import { Badge } from "@/components/ui/badge";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
import {
  matchStatusBadgeSizeClasses,
  operationPhaseBadgeVariant,
} from "@/lib/ui/match-status-ui";
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
        className={matchStatusBadgeSizeClasses.md}
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
        className={matchStatusBadgeSizeClasses.md}
      >
        {match.resultDisplayLabel}
      </Badge>
    </div>
  );
}
