"use client";

import type {
  CourtFieldStatusBoardSummary,
  CourtFieldStatusFilter,
} from "@/lib/court-field-status-display";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGrid5Class } from "@/lib/ui/event-management-ui";

export function CourtFieldStatusSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: CourtFieldStatusBoardSummary;
  activeFilter: CourtFieldStatusFilter;
  onFilterChange: (filter: CourtFieldStatusFilter) => void;
}) {
  return (
    <div className={eventManagementStatGrid5Class}>
      <MatchonStatCardButton
        label="전체 경기장"
        value={summary.totalCourts}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <MatchonStatCardButton
        label="진행중 경기"
        value={summary.inProgressCount}
        active={activeFilter === "in_progress"}
        onClick={() => onFilterChange("in_progress")}
      />
      <MatchonStatCardButton
        label="대기 경기"
        value={summary.waitingCount}
        active={activeFilter === "waiting"}
        onClick={() => onFilterChange("waiting")}
      />
      <MatchonStatCardButton
        label="종료 경기"
        value={summary.completedCount}
        active={activeFilter === "completed"}
        onClick={() => onFilterChange("completed")}
      />
      <MatchonStatCardButton
        label="취소 경기"
        value={summary.cancelledCount}
        active={activeFilter === "cancelled"}
        onClick={() => onFilterChange("cancelled")}
      />
    </div>
  );
}
