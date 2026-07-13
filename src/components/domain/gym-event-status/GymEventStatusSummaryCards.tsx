"use client";

import type { GymEventApplicationStatusSummaryDTO } from "@/lib/services/gym-event-status.service";
import type { GymEventStatusSummaryFilter } from "@/lib/gym-event-status-filters";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { matchonStatsGridClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function GymEventStatusSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: GymEventApplicationStatusSummaryDTO;
  activeFilter: GymEventStatusSummaryFilter;
  onFilterChange: (filter: GymEventStatusSummaryFilter) => void;
}) {
  const items: {
    label: string;
    value: number;
    filter: GymEventStatusSummaryFilter;
  }[] = [
    { label: "전체 신청", value: summary.total, filter: "all" },
    { label: "승인", value: summary.approved, filter: "approved" },
    { label: "대기", value: summary.pending, filter: "pending" },
    { label: "반려", value: summary.rejected, filter: "rejected" },
    { label: "현장 미확인", value: summary.fieldPending, filter: "field_pending" },
    { label: "계체 통과", value: summary.weighPass, filter: "weigh_pass" },
    { label: "출전 확정", value: summary.eligible, filter: "eligible" },
    { label: "대진 배정", value: summary.bracketAssigned, filter: "bracket_assigned" },
  ];

  return (
    <div
      className={cn(
        "grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8",
        matchonStatsGridClass,
      )}
    >
      {items.map((item) => (
        <MatchonStatCardButton
          key={item.filter}
          label={item.label}
          value={item.value}
          active={activeFilter === item.filter}
          onClick={() => onFilterChange(item.filter)}
        />
      ))}
    </div>
  );
}
