"use client";

import { Badge } from "@/components/ui/badge";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
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
        variant={
          phase === "in_progress"
            ? "default"
            : phase === "result_done"
              ? "secondary"
              : phase === "cancelled"
                ? "destructive"
                : "outline"
        }
      >
        {phaseLabel}
      </Badge>
      {phase !== "cancelled" ? (
        <Badge variant={phase === "result_done" ? "secondary" : "outline"}>
          {resultStatusLabel}
        </Badge>
      ) : null}
    </div>
  );
}
