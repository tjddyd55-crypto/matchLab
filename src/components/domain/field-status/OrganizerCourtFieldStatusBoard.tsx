"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CourtFieldStatusCard } from "@/components/domain/field-status/CourtFieldStatusCard";
import { CourtFieldStatusSummaryCards } from "@/components/domain/field-status/CourtFieldStatusSummaryCards";
import { OperationCourtTabBar } from "@/components/domain/operation/OperationCourtTabBar";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonTabs } from "@/components/shared/MatchonTabs";
import { Button } from "@/components/ui/button";
import type { CourtTabId } from "@/lib/court-tab-label";
import {
  buildCourtFieldStatusList,
  matchesCourtFieldStatusFilter,
  summarizeCourtFieldStatusBoard,
  type CourtFieldStatusFilter,
} from "@/lib/court-field-status-display";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";

const STATUS_TAB_ITEMS: { id: CourtFieldStatusFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "in_progress", label: "진행중" },
  { id: "waiting", label: "대기" },
  { id: "completed", label: "종료" },
  { id: "cancelled", label: "취소" },
];

export function OrganizerCourtFieldStatusBoard({
  eventId,
  eventTitle,
  matches,
  courts,
}: {
  eventId: string;
  eventTitle: string;
  matches: OrganizerEventMatchListItemVM[];
  courts: EventCourtVM[];
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [statusFilter, setStatusFilter] = useState<CourtFieldStatusFilter>("all");
  const [courtTab, setCourtTab] = useState<CourtTabId>("all");
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeCourtFieldStatusBoard(matches, courts),
    [matches, courts],
  );

  const courtList = useMemo(
    () => buildCourtFieldStatusList(matches, courts),
    [matches, courts],
  );

  const filteredCourts = useMemo(() => {
    return courtList.filter((court) => {
      if (courtTab !== "all" && court.courtId !== courtTab) return false;
      if (!matchesCourtFieldStatusFilter(court, statusFilter)) return false;
      return true;
    });
  }, [courtList, courtTab, statusFilter]);

  const activeCourts = courts.filter((court) => court.isActive);

  function handleRefresh() {
    setRefreshMessage(null);
    startRefresh(() => {
      router.refresh();
      setRefreshMessage("경기장 현황을 불러왔습니다.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{eventTitle}</p>
        <Button
          type="button"
          variant="outline"
          size="field"
          disabled={isRefreshing}
          onClick={handleRefresh}
        >
          {isRefreshing ? "새로고침 중…" : "새로고침"}
        </Button>
      </div>

      {refreshMessage ? (
        <FeedbackMessage tone="success">{refreshMessage}</FeedbackMessage>
      ) : null}

      <CourtFieldStatusSummaryCards
        summary={summary}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium">상태 필터</p>
        <MatchonTabs
          items={STATUS_TAB_ITEMS}
          activeId={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <OperationCourtTabBar
        courts={courts}
        activeTab={courtTab}
        onTabChange={setCourtTab}
      />

      {activeCourts.length === 0 ? (
        <FeedbackMessage tone="info">
          활성 경기장이 없습니다. 경기장을 등록한 뒤 경기장 현황을 확인하세요.
        </FeedbackMessage>
      ) : filteredCourts.length === 0 ? (
        <FeedbackMessage tone="info">
          선택한 필터에 해당하는 경기장이 없습니다.
        </FeedbackMessage>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourts.map((court) => (
            <CourtFieldStatusCard
              key={court.courtId}
              court={court}
              eventId={eventId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
