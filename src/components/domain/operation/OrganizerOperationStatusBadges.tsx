"use client";

import { Badge } from "@/components/ui/badge";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
import { statusBadgeSizeClasses } from "@/lib/ui/status-badge-ui";
import { operationPhaseBadgeVariant } from "@/lib/ui/match-status-ui";
import { cn } from "@/lib/utils";

export function OrganizerOperationStatusBadges({
  phaseLabel,
  resultStatusLabel,
  phase,
  className,
}: {
  phaseLabel: string;
  resultStatusLabel: string;
  phase: OperationMatchPhase;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-nowrap items-center justify-center gap-2", className)}>
      <Badge
        variant={operationPhaseBadgeVariant(phase)}
        className={statusBadgeSizeClasses.md}
      >
        {phaseLabel}
      </Badge>
      {phase !== "cancelled" ? (
        <Badge variant="resultPending" className={statusBadgeSizeClasses.md}>
          {resultStatusLabel}
        </Badge>
      ) : null}
    </div>
  );
}
