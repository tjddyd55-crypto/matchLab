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
        label="계체 대기"
        value={summary.weighInPending}
        active={activeFilter === "weigh_pending"}
        onClick={() => onFilterChange("weigh_pending")}
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
        label="경기 진행"
        value={summary.handicapProceed}
        active={activeFilter === "handicap_proceed"}
        onClick={() => onFilterChange("handicap_proceed")}
      />
      <MatchonStatCardButton
        label="경기 취소"
        value={summary.matchCancelled}
        active={activeFilter === "match_cancelled"}
        onClick={() => onFilterChange("match_cancelled")}
      />
      <MatchonStatCardButton
        label="실격"
        value={summary.disqualified}
        active={activeFilter === "disqualified"}
        onClick={() => onFilterChange("disqualified")}
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
