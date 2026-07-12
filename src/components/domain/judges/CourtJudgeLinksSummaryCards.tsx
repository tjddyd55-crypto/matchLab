"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CourtFilter = "all" | "active" | "inactive";

function StatCard({
  label,
  value,
  filter,
  activeFilter,
  onSelect,
}: {
  label: string;
  value: number;
  filter: CourtFilter;
  activeFilter: CourtFilter;
  onSelect: (filter: CourtFilter) => void;
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

export function CourtJudgeLinksSummaryCards({
  totalCourts,
  activeCourts,
  inactiveCourts,
  linkCount,
  activeFilter,
  onFilterChange,
}: {
  totalCourts: number;
  activeCourts: number;
  inactiveCourts: number;
  linkCount: number;
  activeFilter: CourtFilter;
  onFilterChange: (filter: CourtFilter) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="전체 경기장"
        value={totalCourts}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="활성 경기장"
        value={activeCourts}
        filter="active"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="비활성 경기장"
        value={inactiveCourts}
        filter="inactive"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <Card variant="default" className="px-4 py-3">
        <p className="text-muted-foreground text-xs">심판 링크 (채점+주심)</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{linkCount}</p>
      </Card>
    </div>
  );
}

export type { CourtFilter };
