"use client";

import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  resolveOrganizerApplicationDisplayStatus,
  isPaidForOrganizerDisplay,
} from "@/lib/application-display-status";
import type { OrganizerApplicationSummaryFilter } from "@/components/domain/applications/organizer-application-filters";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";

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
      <MatchonStatCardButton
        label="전체 신청"
        value={fighterCount}
        hint={`체육관 ${gymCount}곳`}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <MatchonStatCardButton
        label="승인"
        value={approvedCount}
        active={activeFilter === "approved"}
        onClick={() => onFilterChange("approved")}
      />
      <MatchonStatCardButton
        label="미승인"
        value={pendingCount}
        active={activeFilter === "pending"}
        onClick={() => onFilterChange("pending")}
      />
      <MatchonStatCardButton
        label="입금완료"
        value={paidCount}
        active={activeFilter === "paid"}
        onClick={() => onFilterChange("paid")}
      />
      <MatchonStatCardButton
        label="미입금"
        value={unpaidCount}
        active={activeFilter === "unpaid"}
        onClick={() => onFilterChange("unpaid")}
      />
      <MatchonStatCardButton
        label="체육관취소"
        value={gymCancelledCount}
        active={activeFilter === "gym_cancelled"}
        onClick={() => onFilterChange("gym_cancelled")}
      />
      <MatchonStatCardButton
        label="주최측취소"
        value={organizerCancelledCount}
        active={activeFilter === "organizer_cancelled"}
        onClick={() => onFilterChange("organizer_cancelled")}
      />
      <MatchonStatCardButton
        label="입금율"
        value={
          fighterCount > 0
            ? `${Math.round((paidCount / fighterCount) * 100)}%`
            : "—"
        }
        hint={`${paidCount}/${fighterCount}`}
        active={activeFilter === "paid"}
        onClick={() => onFilterChange("paid")}
      />
    </section>
  );
}
