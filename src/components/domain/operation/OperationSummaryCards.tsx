"use client";

import type { OperationBoardFilter, OperationBoardSummary } from "@/lib/match-operation-display";
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
  filter: OperationBoardFilter;
  activeFilter: OperationBoardFilter;
  onSelect: (filter: OperationBoardFilter) => void;
}) {
  const active = activeFilter === filter;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(filter)}
      className={cn(
        "ring-foreground/10 rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary bg-primary/5 ring-primary/30",
      )}
    >
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </button>
  );
}

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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="전체 경기"
        value={summary.total}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="예정 경기"
        value={summary.scheduled}
        filter="scheduled"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="진행 중 경기"
        value={summary.inProgress}
        filter="in_progress"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="완료 경기"
        value={summary.completed}
        filter="completed"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
