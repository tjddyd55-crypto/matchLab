"use client";

import type {
  CourtFieldStatusBoardSummary,
  CourtFieldStatusFilter,
} from "@/lib/court-field-status-display";
import {
  eventManagementStatCardClass,
  eventManagementStatCardInteractiveClass,
  eventManagementStatCardSelectedClass,
  eventManagementStatGridClass,
  eventManagementStatLabelClass,
  eventManagementStatLabelSelectedClass,
  eventManagementStatValueClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  filter,
  activeFilter,
  onSelect,
}: {
  label: string;
  value: number;
  filter: CourtFieldStatusFilter;
  activeFilter: CourtFieldStatusFilter;
  onSelect: (filter: CourtFieldStatusFilter) => void;
}) {
  const active = activeFilter === filter;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(filter)}
      className={cn(
        eventManagementStatCardClass,
        eventManagementStatCardInteractiveClass,
        "w-full",
        active && eventManagementStatCardSelectedClass,
      )}
    >
      <p
        className={cn(
          eventManagementStatLabelClass,
          active && eventManagementStatLabelSelectedClass,
        )}
      >
        {label}
      </p>
      <p className={eventManagementStatValueClass}>{value}</p>
    </button>
  );
}

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
    <div className={eventManagementStatGridClass}>
      <StatCard
        label="전체 경기장"
        value={summary.totalCourts}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="진행중 경기"
        value={summary.inProgressCount}
        filter="in_progress"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="대기 경기"
        value={summary.waitingCount}
        filter="waiting"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="종료 경기"
        value={summary.completedCount}
        filter="completed"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="취소 경기"
        value={summary.cancelledCount}
        filter="cancelled"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
