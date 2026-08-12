"use client";

import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  resolveOrganizerApplicationDisplayStatus,
  isPaidForOrganizerDisplay,
} from "@/lib/application-display-status";
import type { OrganizerApplicationSummaryFilter } from "@/components/domain/applications/organizer-application-filters";
import {
  eventManagementBorderColorClass,
  eventManagementContentSurfaceClass,
  eventManagementSelectedSurfaceClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

function CompactKpiButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[56px] w-full flex-col justify-center rounded-[10px] border px-2.5 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]/30",
        eventManagementBorderColorClass,
        eventManagementContentSurfaceClass,
        "hover:border-[#BFD0FF]/80",
        active && `${eventManagementSelectedSurfaceClass} border-[#0A47FF]`,
      )}
    >
      <span
        className={cn(
          "text-[11px] leading-tight text-[#64748B]",
          active && "text-[#0A47FF]",
        )}
      >
        {label}
      </span>
      <span className="mt-0.5 text-lg font-bold tabular-nums leading-none text-[#0F172A]">
        {value}
      </span>
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
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      <CompactKpiButton
        label="전체 신청"
        value={fighterCount}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <CompactKpiButton
        label="승인"
        value={approvedCount}
        active={activeFilter === "approved"}
        onClick={() => onFilterChange("approved")}
      />
      <CompactKpiButton
        label="미승인"
        value={pendingCount}
        active={activeFilter === "pending"}
        onClick={() => onFilterChange("pending")}
      />
      <CompactKpiButton
        label="입금완료"
        value={paidCount}
        active={activeFilter === "paid"}
        onClick={() => onFilterChange("paid")}
      />
      <CompactKpiButton
        label="미입금"
        value={unpaidCount}
        active={activeFilter === "unpaid"}
        onClick={() => onFilterChange("unpaid")}
      />
      <CompactKpiButton
        label="체육관취소"
        value={gymCancelledCount}
        active={activeFilter === "gym_cancelled"}
        onClick={() => onFilterChange("gym_cancelled")}
      />
      <CompactKpiButton
        label="주최측취소"
        value={organizerCancelledCount}
        active={activeFilter === "organizer_cancelled"}
        onClick={() => onFilterChange("organizer_cancelled")}
      />
      <CompactKpiButton
        label="입금율"
        value={
          fighterCount > 0
            ? `${Math.round((paidCount / fighterCount) * 100)}%`
            : "—"
        }
        active={activeFilter === "paid"}
        onClick={() => onFilterChange("paid")}
      />
    </section>
  );
}
