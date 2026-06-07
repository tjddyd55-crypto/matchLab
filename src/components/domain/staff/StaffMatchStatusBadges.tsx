"use client";

import { Badge } from "@/components/ui/badge";
import { getOperationMatchPhase } from "@/lib/match-operation-display";
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
        variant={
          phase === "in_progress"
            ? "default"
            : phase === "result_done"
              ? "secondary"
              : "outline"
        }
      >
        {match.phaseLabel}
      </Badge>
      <Badge
        variant={
          match.resultDisplayStatus === "confirmed" ||
          match.resultDisplayStatus === "corrected"
            ? "secondary"
            : match.resultDisplayStatus === "voided"
              ? "destructive"
              : "outline"
        }
      >
        {match.resultDisplayLabel}
      </Badge>
    </div>
  );
}
