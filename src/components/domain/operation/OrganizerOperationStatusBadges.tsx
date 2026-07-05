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
  stacked = false,
  size = "md",
}: {
  phaseLabel: string;
  resultStatusLabel: string;
  phase: OperationMatchPhase;
  className?: string;
  stacked?: boolean;
  size?: keyof typeof statusBadgeSizeClasses;
}) {
  const sizeClass = cn(statusBadgeSizeClasses[size], "whitespace-nowrap");

  return (
    <div
      className={cn(
        stacked
          ? "flex flex-col items-center justify-center gap-1"
          : "flex flex-nowrap items-center justify-center gap-2",
        className,
      )}
    >
      <Badge variant={operationPhaseBadgeVariant(phase)} className={sizeClass}>
        {phaseLabel}
      </Badge>
      {phase !== "cancelled" ? (
        <Badge variant="resultPending" className={sizeClass}>
          {resultStatusLabel}
        </Badge>
      ) : null}
    </div>
  );
}
