"use client";

import { Badge } from "@/components/ui/badge";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
import {
  matchStatusBadgeSizeClasses,
  operationPhaseBadgeVariant,
} from "@/lib/ui/match-status-ui";
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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge
        variant={operationPhaseBadgeVariant(phase)}
        className={matchStatusBadgeSizeClasses.md}
      >
        {phaseLabel}
      </Badge>
      {phase !== "cancelled" ? (
        <Badge variant="outline" className={matchStatusBadgeSizeClasses.md}>
          {resultStatusLabel}
        </Badge>
      ) : null}
    </div>
  );
}
