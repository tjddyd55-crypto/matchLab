"use client";

import type { OperationBoardFilter, OperationBoardSummary } from "@/lib/match-operation-display";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { organizerOperationStatsGridClass } from "@/lib/ui/organizer-operation-ui";

export function OperationSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: OperationBoardSummary;
  activeFilter: OperationBoardFilter;
  onFilterChange: (filter: OperationBoardFilter) => void;
}) {
  return (
    <div className={organizerOperationStatsGridClass}>
      <MatchonStatCardButton
        label="전체 경기"
        value={summary.total}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <MatchonStatCardButton
        label="대기"
        value={summary.scheduled}
        active={activeFilter === "scheduled"}
        onClick={() => onFilterChange("scheduled")}
      />
      <MatchonStatCardButton
        label="경기준비"
        value={summary.preparing}
        active={activeFilter === "preparing"}
        onClick={() => onFilterChange("preparing")}
      />
      <MatchonStatCardButton
        label="진행중"
        value={summary.inProgress}
        active={activeFilter === "in_progress"}
        onClick={() => onFilterChange("in_progress")}
      />
      <MatchonStatCardButton
        label="경기종료"
        value={summary.completed}
        active={activeFilter === "completed"}
        onClick={() => onFilterChange("completed")}
      />
    </div>
  );
}
