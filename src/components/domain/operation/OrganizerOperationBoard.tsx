"use client";

import { useMemo, useRef, useState } from "react";
import { OperationSummaryCards } from "@/components/domain/operation/OperationSummaryCards";
import { OrganizerOperationCardListMobile } from "@/components/domain/operation/OrganizerOperationCardListMobile";
import { OrganizerOperationDetailDrawer } from "@/components/domain/operation/OrganizerOperationDetailDrawer";
import { OrganizerOperationTableDesktop } from "@/components/domain/operation/OrganizerOperationTableDesktop";
import {
  toOperationMatchRow,
  type OperationMatchRowVM,
} from "@/components/domain/operation/operation-match-row";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import {
  matchesOperationBoardFilter,
  matchesOperationSearchQuery,
  summarizeOperationBoard,
  type OperationBoardFilter,
} from "@/lib/match-operation-display";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: OperationBoardFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "scheduled", label: "예정" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "result_pending", label: "결과 미입력" },
  { value: "result_done", label: "결과 입력 완료" },
];

export function OrganizerOperationBoard({
  matches,
}: {
  matches: OrganizerEventMatchListItemVM[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [summaryFilter, setSummaryFilter] = useState<OperationBoardFilter>("all");
  const [statusFilter, setStatusFilter] = useState<OperationBoardFilter>("all");
  const [search, setSearch] = useState("");
  const [detailMatch, setDetailMatch] = useState<OperationMatchRowVM | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<"result" | "view">("result");

  const summary = useMemo(() => summarizeOperationBoard(matches), [matches]);

  const sortedRows = useMemo(() => {
    return [...matches]
      .sort((a, b) => {
        const ga = a.globalMatchOrder ?? a.matchOrder;
        const gb = b.globalMatchOrder ?? b.matchOrder;
        if (ga !== gb) return ga - gb;
        return a.matchOrder - b.matchOrder;
      })
      .map(toOperationMatchRow);
  }, [matches]);

  const activeFilter = statusFilter !== "all" ? statusFilter : summaryFilter;

  const filteredRows = useMemo(() => {
    return sortedRows.filter((row) => {
      if (!matchesOperationBoardFilter(row, activeFilter)) return false;
      return matchesOperationSearchQuery(row, search);
    });
  }, [sortedRows, activeFilter, search]);

  const selectClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm";

  function handleSummaryFilterChange(filter: OperationBoardFilter) {
    setSummaryFilter(filter);
    setStatusFilter("all");
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openDetail(row: OperationMatchRowVM, mode: "result" | "view") {
    setDetailMatch(row);
    setDetailMode(mode);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <OperationSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">검색</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="선수명, 체육관명, 부문명"
            className={cn(selectClass, "w-full")}
          />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">상태 필터</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value as OperationBoardFilter;
              setStatusFilter(value);
              if (value !== "all") setSummaryFilter("all");
            }}
            className={selectClass}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={listRef} className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {filteredRows.length}건 표시 (전체 {matches.length}건)
        </p>

        <OrganizerOperationTableDesktop
          rows={filteredRows}
          onOpenResult={(row) => openDetail(row, "result")}
          onOpenView={(row) => openDetail(row, "view")}
        />
        <OrganizerOperationCardListMobile
          rows={filteredRows}
          onOpenResult={(row) => openDetail(row, "result")}
          onOpenView={(row) => openDetail(row, "view")}
        />
      </div>

      <OrganizerOperationDetailDrawer
        match={detailMatch}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        mode={detailMode}
      />
    </div>
  );
}
