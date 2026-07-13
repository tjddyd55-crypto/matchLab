"use client";

import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";
import type { FieldStatusSummaryFilter } from "@/components/domain/field-status/field-status-filters";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";

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
      <MatchonStatCardButton
        label="전체 승인 신청자"
        value={summary.totalApproved}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <MatchonStatCardButton
        label="현장 확인"
        value={summary.checkedIn}
        active={activeFilter === "checked_in"}
        onClick={() => onFilterChange("checked_in")}
      />
      <MatchonStatCardButton
        label="미확인"
        value={summary.pendingCheckIn}
        active={activeFilter === "pending"}
        onClick={() => onFilterChange("pending")}
      />
      <MatchonStatCardButton
        label="미출석·철회·실격"
        value={summary.noShow}
        active={activeFilter === "no_show_group"}
        onClick={() => onFilterChange("no_show_group")}
      />
      <MatchonStatCardButton
        label="계체 통과"
        value={summary.weighInPass}
        active={activeFilter === "weigh_in_pass"}
        onClick={() => onFilterChange("weigh_in_pass")}
      />
      <MatchonStatCardButton
        label="계체 실패"
        value={summary.weighInFail}
        active={activeFilter === "weigh_in_fail"}
        onClick={() => onFilterChange("weigh_in_fail")}
      />
      <MatchonStatCardButton
        label="수동 승인"
        value={summary.manualPass}
        active={activeFilter === "manual_pass"}
        onClick={() => onFilterChange("manual_pass")}
      />
      <MatchonStatCardButton
        label="출전 확정"
        value={summary.eligibleCount}
        active={activeFilter === "eligible"}
        onClick={() => onFilterChange("eligible")}
      />
    </div>
  );
}
