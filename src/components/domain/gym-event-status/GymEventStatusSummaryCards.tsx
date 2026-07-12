"use client";

import type { GymEventApplicationStatusSummaryDTO } from "@/lib/services/gym-event-status.service";
import type { GymEventStatusSummaryFilter } from "@/lib/gym-event-status-filters";
import { Card } from "@/components/ui/card";
import { matchonGridGapClass } from "@/lib/ui/matchon-layout";
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
  filter: GymEventStatusSummaryFilter;
  activeFilter: GymEventStatusSummaryFilter;
  onSelect: (filter: GymEventStatusSummaryFilter) => void;
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

export function GymEventStatusSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: GymEventApplicationStatusSummaryDTO;
  activeFilter: GymEventStatusSummaryFilter;
  onFilterChange: (filter: GymEventStatusSummaryFilter) => void;
}) {
  return (
    <div
      className={cn(
        "grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8",
        matchonGridGapClass,
      )}
    >
      <StatCard
        label="전체 신청"
        value={summary.total}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="승인"
        value={summary.approved}
        filter="approved"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="대기"
        value={summary.pending}
        filter="pending"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="반려"
        value={summary.rejected}
        filter="rejected"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="현장 미확인"
        value={summary.fieldPending}
        filter="field_pending"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="계체 통과"
        value={summary.weighPass}
        filter="weigh_pass"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="출전 확정"
        value={summary.eligible}
        filter="eligible"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="대진 배정"
        value={summary.bracketAssigned}
        filter="bracket_assigned"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
