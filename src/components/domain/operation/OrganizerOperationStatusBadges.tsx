"use client";

import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import { BracketMatchStatus } from "@/lib/enums";
import type { OperationMatchPhase } from "@/lib/match-operation-display";
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
  status: BracketMatchStatus | string;
  className?: string;
  stacked?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        stacked
          ? "flex flex-col items-center justify-center gap-1"
          : "flex flex-nowrap items-center justify-center gap-2",
        className,
      )}
    >
      <MatchStatusBadge status={status} size={size} />
      {phase !== "cancelled" && status !== BracketMatchStatus.cancelled ? (
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">
          {resultStatusLabel}
        </span>
      ) : null}
    </div>
  );
}
