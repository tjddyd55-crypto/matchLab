"use client";

import { useMemo, useState } from "react";
import { StaffMatchCard } from "@/components/domain/staff/StaffMatchCard";
import { StaffResultEntrySheet } from "@/components/domain/staff/StaffResultEntrySheet";
import { StaffResultSummaryCards } from "@/components/domain/staff/StaffResultSummaryCards";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";
import {
  matchesStaffBoardFilter,
  matchesStaffSearchQuery,
  summarizeStaffBoard,
  type StaffBoardFilter,
} from "@/lib/staff-match-display";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: StaffBoardFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행 중" },
  { value: "result_pending", label: "결과 미입력" },
  { value: "result_done", label: "결과 입력 완료" },
];

export type StaffResultEntryAccess = {
  token: string;
  label: string;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
  canChangeMatchStatus: boolean;
};

export function StaffResultEntryBoard({
  matches,
  staffAccess,
}: {
  matches: StaffEventMatchListItemVM[];
  staffAccess: StaffResultEntryAccess;
}) {
  const [summaryFilter, setSummaryFilter] = useState<StaffBoardFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StaffBoardFilter>("all");
  const [search, setSearch] = useState("");
  const [sheetMatch, setSheetMatch] = useState<StaffEventMatchListItemVM | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"entry" | "edit" | "view">("entry");

  const summary = useMemo(() => summarizeStaffBoard(matches), [matches]);
  const activeFilter = statusFilter !== "all" ? statusFilter : summaryFilter;

  const sorted = useMemo(() => {
    return [...matches].sort((a, b) => {
      const ga = a.globalMatchOrder ?? a.matchOrder;
      const gb = b.globalMatchOrder ?? b.matchOrder;
      if (ga !== gb) return ga - gb;
      return a.matchOrder - b.matchOrder;
    });
  }, [matches]);

  const filtered = useMemo(() => {
    return sorted.filter((row) => {
      if (!matchesStaffBoardFilter(row, activeFilter)) return false;
      return matchesStaffSearchQuery(row, search);
    });
  }, [sorted, activeFilter, search]);

  const selectClass =
    "border-input bg-background h-11 w-full rounded-md border px-3 text-sm shadow-sm";

  function openSheet(
    row: StaffEventMatchListItemVM,
    mode: "entry" | "edit" | "view",
  ) {
    setSheetMatch(row);
    setSheetMode(mode);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <StaffResultSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={(filter) => {
          setSummaryFilter(filter);
          setStatusFilter("all");
        }}
      />

      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="선수명, 체육관, 경기구분 검색"
          className={selectClass}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value as StaffBoardFilter;
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
      </div>

      <p className="text-muted-foreground text-sm">
        {filtered.length}건 표시 (전체 {matches.length}건)
      </p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border px-4 py-10 text-center text-sm">
          표시할 경기가 없습니다.
        </p>
      ) : (
        <div className={cn("grid gap-4", "lg:grid-cols-2")}>
          {filtered.map((match) => (
            <StaffMatchCard
              key={match.matchId}
              match={match}
              onOpenEntry={() => openSheet(match, "entry")}
              onOpenEdit={() => openSheet(match, "edit")}
              onOpenView={() => openSheet(match, "view")}
            />
          ))}
        </div>
      )}

      <StaffResultEntrySheet
        match={sheetMatch}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        staffToken={staffAccess.token}
        canRecordOutcomeDraft={staffAccess.canRecordOutcomeDraft}
        canConfirmResult={staffAccess.canConfirmResult}
      />
    </div>
  );
}
