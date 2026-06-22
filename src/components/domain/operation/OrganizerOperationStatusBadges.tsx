"use client";

import { Badge } from "@/components/ui/badge";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
import {
  matchStatusBadgeTypography,
  operationPhaseBadgeVariant,
} from "@/lib/match-status-display";
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
        className={matchStatusBadgeTypography}
      >
        {phaseLabel}
      </Badge>
      {phase !== "cancelled" ? (
        <Badge variant="outline" className={matchStatusBadgeTypography}>
          {resultStatusLabel}
        </Badge>
      ) : null}
    </div>
  );
}
