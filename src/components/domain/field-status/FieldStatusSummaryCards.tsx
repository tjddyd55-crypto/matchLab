"use client";

import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";
import type { FieldStatusSummaryFilter } from "@/components/domain/field-status/field-status-filters";
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
  filter: FieldStatusSummaryFilter;
  activeFilter: FieldStatusSummaryFilter;
  onSelect: (filter: FieldStatusSummaryFilter) => void;
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

export function FieldStatusSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: FieldStatusSummaryDTO;
  activeFilter: FieldStatusSummaryFilter;
  onFilterChange: (filter: FieldStatusSummaryFilter) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <StatCard
        label="전체 승인 신청자"
        value={summary.totalApproved}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="현장 확인"
        value={summary.checkedIn}
        filter="checked_in"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="미확인"
        value={summary.pendingCheckIn}
        filter="pending"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="미출석·철회·실격"
        value={summary.noShow}
        filter="no_show_group"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="계체 통과"
        value={summary.weighInPass}
        filter="weigh_in_pass"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="계체 실패"
        value={summary.weighInFail}
        filter="weigh_in_fail"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="수동 승인"
        value={summary.manualPass}
        filter="manual_pass"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="출전 확정"
        value={summary.eligibleCount}
        filter="eligible"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </div>
  );
}
