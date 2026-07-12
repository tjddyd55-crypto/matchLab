"use client";

import { Card } from "@/components/ui/card";
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="전체 경기"
        value={summary.total}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="대기"
        value={summary.scheduled}
        filter="scheduled"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="경기준비"
        value={summary.preparing}
        filter="preparing"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="진행중"
        value={summary.inProgress}
        filter="in_progress"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="경기종료"
        value={summary.completed}
        filter="completed"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
