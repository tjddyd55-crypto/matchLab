"use client";

import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
import { resolveOperationDisplayStatus } from "@/lib/ui/matchon-status";
import { cn } from "@/lib/utils";

export function OrganizerOperationStatusBadges({
  resultStatusLabel,
  phase,
  status,
  className,
  stacked = false,
  size = "md",
}: {
  phaseLabel: string;
  resultStatusLabel: string;
  phase: OperationMatchPhase;
  status: string;
  className?: string;
  stacked?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const displayStatus = resolveOperationDisplayStatus({ status, phase });

  return (
    <div
      className={cn(
        stacked
          ? "flex flex-col items-center justify-center gap-1"
          : "flex flex-nowrap items-center justify-center gap-2",
        className,
      )}
    >
      <MatchonStatusBadge status={displayStatus} size={size} />
      {phase !== "cancelled" ? (
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">
          {resultStatusLabel}
        </span>
      ) : null}
    </div>
  );
}
