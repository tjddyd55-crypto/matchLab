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
  const showResultHint =
    Boolean(resultStatusLabel) &&
    resultStatusLabel !== "—" &&
    phase !== "cancelled" &&
    status !== BracketMatchStatus.cancelled &&
    // 공식 결과 보조 문구는 미입력만 표시
    resultStatusLabel === "결과 미입력";

  const displayStatus =
    phase === "finished" || phase === "result_done"
      ? BracketMatchStatus.finished
      : status;

  return (
    <div
      className={cn(
        stacked
          ? "flex flex-col items-center justify-center gap-1"
          : "flex flex-nowrap items-center justify-center gap-2",
        className,
      )}
    >
      <MatchStatusBadge
        status={displayStatus}
        label={
          phase === "finished" || phase === "result_done"
            ? "경기종료"
            : undefined
        }
        size={size}
      />
      {showResultHint ? (
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">
          {resultStatusLabel}
        </span>
      ) : null}
    </div>
  );
}
