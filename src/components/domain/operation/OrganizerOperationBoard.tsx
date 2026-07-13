"use client";

import { useMemo, useRef, useState } from "react";
import { OperationCourtTabBar } from "@/components/domain/operation/OperationCourtTabBar";
import { OperationSpotlightSection } from "@/components/domain/operation/OperationSpotlightSection";
import { OperationSummaryCards } from "@/components/domain/operation/OperationSummaryCards";
import { OrganizerOperationCardListMobile } from "@/components/domain/operation/OrganizerOperationCardListMobile";
import { OrganizerOperationTableDesktop } from "@/components/domain/operation/OrganizerOperationTableDesktop";
import {
  toOperationMatchRow,
  type OperationMatchRowVM,
} from "@/components/domain/operation/operation-match-row";
import type { CourtTabId } from "@/lib/court-tab-label";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import {
  formatOperationOrderLabel,
  matchesOperationBoardFilter,
  matchesOperationSearchQuery,
  sortOperationMatchRows,
  pickOperationSpotlightMatches,
  summarizeOperationBoard,
  type OperationBoardFilter,
} from "@/lib/match-operation-display";
import {
  organizerOperationFieldInputClass,
  organizerOperationFieldSelectClass,
  organizerOperationFilterBarClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: OperationBoardFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "scheduled", label: "대기" },
  { value: "preparing", label: "경기준비" },
  { value: "in_progress", label: "경기진행중" },
  { value: "completed", label: "완료" },
  { value: "result_pending", label: "결과 미입력" },
  { value: "result_done", label: "결과 입력 완료" },
];

export type JudgeMatchSummaryVM = {
  assignedCount: number;
  submittedCount: number;
};

function matchesCourtTab(row: OperationMatchRowVM, courtTab: CourtTabId): boolean {
  if (courtTab === "all") return true;
  return row.courtId === courtTab;
}

export function OrganizerOperationBoard({
  matches,
  courts,
  judgeSummaryByMatch,
  judgeBriefByMatch = {},
}: {
  matches: OrganizerEventMatchListItemVM[];
  courts: EventCourtVM[];
  judgeSummaryByMatch?: Record<string, JudgeMatchSummaryVM>;
  judgeBriefByMatch?: Record<string, { judgeName: string; winnerCorner: string }[]>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [courtTab, setCourtTab] = useState<CourtTabId>("all");
  const [summaryFilter, setSummaryFilter] = useState<OperationBoardFilter>("all");
  const [statusFilter, setStatusFilter] = useState<OperationBoardFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeOperationBoard(matches), [matches]);

  const baseRows = useMemo(() => {
    return matches.map((m) => toOperationMatchRow(m, judgeSummaryByMatch?.[m.matchId]));
  }, [matches, judgeSummaryByMatch]);

  const activeFilter = statusFilter !== "all" ? statusFilter : summaryFilter;

  const filteredRows = useMemo(() => {
    const filtered = baseRows.filter((row) => {
      if (!matchesCourtTab(row, courtTab)) return false;
      if (!matchesOperationSearchQuery(row, search)) return false;
      if (!matchesOperationBoardFilter(row, activeFilter)) return false;
      return true;
    });

    return sortOperationMatchRows(filtered, courtTab, courts).map((row) => ({
      ...row,
      orderLabel: formatOperationOrderLabel(row, courtTab),
    }));
  }, [baseRows, courtTab, courts, search, activeFilter]);

  const spotlight = useMemo(
    () => pickOperationSpotlightMatches(filteredRows),
    [filteredRows],
  );

  const defaultFocusedMatchId = useMemo(
    () =>
      spotlight.current?.matchId ??
      spotlight.next?.matchId ??
      filteredRows[0]?.matchId ??
      null,
    [spotlight, filteredRows],
  );

  const effectiveFocusedMatchId = useMemo(() => {
    if (
      focusedMatchId &&
      filteredRows.some((row) => row.matchId === focusedMatchId)
    ) {
      return focusedMatchId;
    }
    return defaultFocusedMatchId;
  }, [focusedMatchId, filteredRows, defaultFocusedMatchId]);

  function handleSummaryFilterChange(filter: OperationBoardFilter) {
    setSummaryFilter(filter);
    setStatusFilter("all");
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function toggleInlinePanel(row: OperationMatchRowVM) {
    setExpandedMatchId((cur) => (cur === row.matchId ? null : row.matchId));
    setFocusedMatchId(row.matchId);
  }

  function focusMatch(matchId: string) {
    setFocusedMatchId(matchId);
  }

  return (
    <div className="flex flex-col gap-5">
      <OperationSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <OperationCourtTabBar
        courts={courts}
        activeTab={courtTab}
        onTabChange={setCourtTab}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <div ref={listRef} className="min-w-0 space-y-4">
          <div className={organizerOperationFilterBarClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
                <span className="text-matchon-text-secondary text-xs">검색</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="선수명, 체육관명, 경기구분명"
                  className={cn(organizerOperationFieldInputClass, "w-full")}
                />
              </label>
              <label className="flex min-w-[160px] flex-col gap-1 text-sm">
                <span className="text-matchon-text-secondary text-xs">
                  상태 필터
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const value = e.target.value as OperationBoardFilter;
                    setStatusFilter(value);
                    if (value !== "all") setSummaryFilter("all");
                  }}
                  className={organizerOperationFieldSelectClass}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-matchon-text-primary">
              전체 경기 목록
            </h2>
            <p className="text-matchon-text-secondary text-xs">
              {filteredRows.length}건 표시 (전체 {matches.length}건)
            </p>
          </div>

          <OrganizerOperationTableDesktop
            rows={filteredRows}
            expandedMatchId={expandedMatchId}
            onTogglePanel={toggleInlinePanel}
            judgeBriefByMatch={judgeBriefByMatch}
          />
          <OrganizerOperationCardListMobile
            rows={filteredRows}
            expandedMatchId={expandedMatchId}
            onTogglePanel={toggleInlinePanel}
            judgeBriefByMatch={judgeBriefByMatch}
          />
        </div>

        <OperationSpotlightSection
          rows={filteredRows}
          focusedMatchId={effectiveFocusedMatchId}
          onFocusMatch={focusMatch}
          className="lg:min-w-0"
        />
      </div>
    </div>
  );
}
