"use client";

import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGrid4Class } from "@/lib/ui/event-management-ui";

type CourtFilter = "all" | "active" | "inactive";

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
    <div className={eventManagementStatGrid4Class}>
      <MatchonStatCardButton
        label="전체 경기장"
        value={totalCourts}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <MatchonStatCardButton
        label="활성 경기장"
        value={activeCourts}
        active={activeFilter === "active"}
        onClick={() => onFilterChange("active")}
      />
      <MatchonStatCardButton
        label="비활성 경기장"
        value={inactiveCourts}
        active={activeFilter === "inactive"}
        onClick={() => onFilterChange("inactive")}
      />
      <MatchonStatCardButton
        label="심판 링크 (채점+주심)"
        value={linkCount}
      />
    </div>
  );
}

export type { CourtFilter };
