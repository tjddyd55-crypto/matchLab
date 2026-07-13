"use client";

import { useMemo, useRef, useState } from "react";
import { BracketMatchStatus } from "@/lib/enums";
import { OperationCompactSummaryBar } from "@/components/domain/operation/OperationCompactSummaryBar";
import { OperationCourtTabBar } from "@/components/domain/operation/OperationCourtTabBar";
import { OperationMatchListPane } from "@/components/domain/operation/OperationMatchListPane";
import { OperationSpotlightSection } from "@/components/domain/operation/OperationSpotlightSection";
import { OrganizerOperationCardListMobile } from "@/components/domain/operation/OrganizerOperationCardListMobile";
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
  sortOperationMatchRows,
  pickOperationSpotlightMatches,
  summarizeOperationBoard,
  type OperationBoardFilter,
} from "@/lib/match-operation-display";
import {
  organizerOperationDetailPaneClass,
  organizerOperationFieldSelectClass,
  organizerOperationListHeaderClass,
  organizerOperationListPaneClass,
  organizerOperationListScrollClass,
  organizerOperationWorkspaceClass,
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
  const [statusPatches, setStatusPatches] = useState<
    Record<string, BracketMatchStatus>
  >({});
  const [courtTab, setCourtTab] = useState<CourtTabId>("all");
  const [summaryFilter, setSummaryFilter] = useState<OperationBoardFilter>("all");
  const [statusFilter, setStatusFilter] = useState<OperationBoardFilter>("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);

  const liveMatches = useMemo(
    () =>
      matches.map((match) => {
        const patchedStatus = statusPatches[match.matchId];
        if (!patchedStatus || patchedStatus === match.status) return match;
        return { ...match, status: patchedStatus };
      }),
    [matches, statusPatches],
  );

  const summary = useMemo(() => summarizeOperationBoard(liveMatches), [liveMatches]);

  const baseRows = useMemo(() => {
    return liveMatches.map((m) => toOperationMatchRow(m, judgeSummaryByMatch?.[m.matchId]));
  }, [liveMatches, judgeSummaryByMatch]);

  const activeFilter = statusFilter !== "all" ? statusFilter : summaryFilter;

  const filteredRows = useMemo(() => {
    const filtered = baseRows.filter((row) => {
      if (!matchesCourtTab(row, courtTab)) return false;
      if (!matchesOperationBoardFilter(row, activeFilter)) return false;
      return true;
    });

    return sortOperationMatchRows(filtered, courtTab, courts).map((row) => ({
      ...row,
      orderLabel: formatOperationOrderLabel(row, courtTab),
    }));
  }, [baseRows, courtTab, courts, activeFilter]);

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

  function handleMatchStatusChanged(matchId: string, status: BracketMatchStatus) {
    setStatusPatches((current) => ({ ...current, [matchId]: status }));
  }

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <OperationCompactSummaryBar
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <OperationCourtTabBar
        courts={courts}
        activeTab={courtTab}
        onTabChange={setCourtTab}
      />

      <div className={organizerOperationWorkspaceClass}>
        <div
          ref={listRef}
          className={organizerOperationListPaneClass}
          data-testid="operation-list-pane"
        >
          <div className={organizerOperationListHeaderClass}>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-matchon-text-primary">
                경기 목록
              </h2>
              <p className="text-matchon-text-secondary text-xs">
                {filteredRows.length}건 표시
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs">
              <span className="text-matchon-text-secondary sr-only sm:not-sr-only">
                상태
              </span>
              <select
                aria-label="상태 필터"
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value as OperationBoardFilter;
                  setStatusFilter(value);
                  if (value !== "all") setSummaryFilter("all");
                }}
                className={cn(
                  organizerOperationFieldSelectClass,
                  "h-9 min-w-[7.5rem] w-auto",
                )}
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={cn(organizerOperationListScrollClass, "hidden md:flex")}>
            <OperationMatchListPane
              rows={filteredRows}
              selectedMatchId={effectiveFocusedMatchId}
              onSelectMatch={focusMatch}
            />
          </div>

          <OrganizerOperationCardListMobile
            rows={filteredRows}
            expandedMatchId={expandedMatchId}
            onTogglePanel={toggleInlinePanel}
            judgeBriefByMatch={judgeBriefByMatch}
          />
        </div>

        <div
          className={cn(organizerOperationDetailPaneClass, "hidden md:block")}
          data-testid="operation-detail-pane"
        >
          <OperationSpotlightSection
            rows={filteredRows}
            focusedMatchId={effectiveFocusedMatchId}
            onFocusMatch={focusMatch}
            onMatchStatusChanged={handleMatchStatusChanged}
          />
        </div>

        <div className="md:hidden">
          {expandedMatchId ? (
            <OperationSpotlightSection
              rows={filteredRows}
              focusedMatchId={expandedMatchId}
              onFocusMatch={focusMatch}
              onMatchStatusChanged={handleMatchStatusChanged}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
