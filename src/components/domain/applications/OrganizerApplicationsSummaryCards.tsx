"use client";

import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  resolveOrganizerApplicationDisplayStatus,
  isPaidForOrganizerDisplay,
} from "@/lib/application-display-status";
import type { OrganizerApplicationSummaryFilter } from "@/components/domain/applications/organizer-application-filters";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  filter,
  activeFilter,
  onSelect,
}: {
  label: string;
  value: string | number;
  hint?: string;
  filter: OrganizerApplicationSummaryFilter;
  activeFilter: OrganizerApplicationSummaryFilter;
  onSelect: (filter: OrganizerApplicationSummaryFilter) => void;
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
        {hint ? (
          <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p>
        ) : null}
      </Card>
    </button>
  );
}

export function OrganizerApplicationsSummaryCards({
  rows,
  activeFilter,
  onFilterChange,
}: {
  rows: OrganizerApplicationRowVM[];
  activeFilter: OrganizerApplicationSummaryFilter;
  onFilterChange: (filter: OrganizerApplicationSummaryFilter) => void;
}) {
  const gymCount = new Set(rows.map((r) => r.gymId).filter(Boolean)).size;
  const fighterCount = rows.length;
  const paidCount = rows.filter((r) =>
    isPaidForOrganizerDisplay(r.paymentStatus),
  ).length;
  const unpaidCount = fighterCount - paidCount;
  const pendingCount = rows.filter(
    (r) =>
      resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      }) === "pending",
  ).length;
  const approvedCount = rows.filter(
    (r) =>
      resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      }) === "approved",
  ).length;
  const gymCancelledCount = rows.filter(
    (r) =>
      resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      }) === "gym_cancelled",
  ).length;
  const organizerCancelledCount = rows.filter(
    (r) =>
      resolveOrganizerApplicationDisplayStatus({
        status: r.applicationStatus,
        cancellationSource: r.cancellationSource,
      }) === "organizer_cancelled",
  ).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <StatCard
        label="전체 신청"
        value={fighterCount}
        hint={`체육관 ${gymCount}곳`}
        filter="all"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="승인"
        value={approvedCount}
        filter="approved"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="미승인"
        value={pendingCount}
        filter="pending"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="입금완료"
        value={paidCount}
        filter="paid"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="미입금"
        value={unpaidCount}
        filter="unpaid"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="체육관취소"
        value={gymCancelledCount}
        filter="gym_cancelled"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="주최측취소"
        value={organizerCancelledCount}
        filter="organizer_cancelled"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
      <StatCard
        label="입금율"
        value={
          fighterCount > 0
            ? `${Math.round((paidCount / fighterCount) * 100)}%`
            : "—"
        }
        hint={`${paidCount}/${fighterCount}`}
        filter="paid"
        activeFilter={activeFilter}
        onSelect={onFilterChange}
      />
    </section>
  );
}
