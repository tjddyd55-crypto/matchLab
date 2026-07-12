"use client";

import { Card } from "@/components/ui/card";
import type {
  CourtFieldStatusBoardSummary,
  CourtFieldStatusFilter,
} from "@/lib/court-field-status-display";
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
      className="w-full text-left"
    >
      <Card
        variant={active ? "selected" : "interactive"}
        className={cn(
          "px-4 py-3 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </Card>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
