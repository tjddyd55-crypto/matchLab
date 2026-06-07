"use client";

import type { StaffBoardFilter, StaffBoardSummary } from "@/lib/staff-match-display";
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
  filter: StaffBoardFilter;
  activeFilter: StaffBoardFilter;
  onSelect: (filter: StaffBoardFilter) => void;
}) {
  const active = activeFilter === filter;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(filter)}
      className={cn(
        "ring-foreground/10 rounded-lg border bg-card px-3 py-3 text-left shadow-sm transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary bg-primary/5 ring-primary/30",
      )}
    >
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </button>
  );
}

export function StaffResultSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: StaffBoardSummary;
  activeFilter: StaffBoardFilter;
  onFilterChange: (filter: StaffBoardFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard
        label="전체"
        value={summary.total}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="진행 중"
        value={summary.inProgress}
        filter="in_progress"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="결과 미입력"
        value={summary.resultPending}
        filter="result_pending"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="완료"
        value={summary.completed}
        filter="result_done"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
