"use client";

import { useMemo, useRef, useState } from "react";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { FieldStatusSummaryCards } from "@/components/domain/field-status/FieldStatusSummaryCards";
import { OrganizerFieldStatusTable } from "@/components/domain/field-status/OrganizerFieldStatusTable";
import { OrganizerFieldStatusDetailDrawer } from "@/components/domain/field-status/OrganizerFieldStatusDetailDrawer";
import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";
import {
  checkInSelectValueForFilter,
  matchesFieldStatusSearchQuery,
  matchesFieldStatusSummaryFilter,
  type FieldStatusSummaryFilter,
} from "@/components/domain/field-status/field-status-filters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OrganizerFieldStatusBoard({
  rows,
  summary,
}: {
  rows: FieldStatusRowDTO[];
  summary: FieldStatusSummaryDTO;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [gymFilter, setGymFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [summaryFilter, setSummaryFilter] =
    useState<FieldStatusSummaryFilter>("all");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [detailRow, setDetailRow] = useState<FieldStatusRowDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const gymOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.gymId, r.gymName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const divisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.divisionId, r.divisionLabel);
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesFieldStatusSearchQuery(r, search)) return false;
      if (gymFilter !== "all" && r.gymId !== gymFilter) return false;
      if (divisionFilter !== "all" && r.divisionId !== divisionFilter)
        return false;
      if (
        checkInFilter !== "all" &&
        checkInFilter !== "no_show_group" &&
        r.checkInStatus !== checkInFilter
      ) {
        return false;
      }
      if (checkInFilter === "no_show_group") {
        const inGroup =
          r.checkInStatus === "no_show" ||
          r.checkInStatus === "withdrawn" ||
          r.checkInStatus === "disqualified";
        if (!inGroup) return false;
      }
      if (!matchesFieldStatusSummaryFilter(r, summaryFilter)) return false;
      return true;
    });
  }, [rows, search, gymFilter, divisionFilter, checkInFilter, summaryFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    gymFilter !== "all" ||
    divisionFilter !== "all" ||
    summaryFilter !== "all" ||
    checkInFilter !== "all";

  const selectClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm";

  function handleSummaryFilterChange(filter: FieldStatusSummaryFilter) {
    setSummaryFilter(filter);
    setCheckInFilter(checkInSelectValueForFilter(filter));
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleCheckInDropdown(value: string) {
    setCheckInFilter(value);
    if (value === "all") {
      setSummaryFilter("all");
      return;
    }
    if (value === "checked_in") setSummaryFilter("checked_in");
    else if (value === "pending") setSummaryFilter("pending");
    else if (value === "no_show_group") setSummaryFilter("no_show_group");
    else setSummaryFilter("all");
  }

  function resetFilters() {
    setSearch("");
    setGymFilter("all");
    setDivisionFilter("all");
    setSummaryFilter("all");
    setCheckInFilter("all");
  }

  function openDetail(row: FieldStatusRowDTO) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldStatusSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <label className="flex w-full flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">검색</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="선수명, 체육관, 부문으로 검색"
            className={cn(selectClass, "w-full")}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">체육관</span>
            <select
              className={selectClass}
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
            >
              <option value="all">전체</option>
              {gymOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">부문</span>
            <select
              className={selectClass}
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="all">전체</option>
              {divisionOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">현장 확인</span>
            <select
              className={cn(selectClass, "min-w-[8rem]")}
              value={checkInFilter}
              onChange={(e) => handleCheckInDropdown(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="pending">미확인</option>
              <option value="checked_in">현장 확인</option>
              <option value="no_show_group">미출석·철회·실격</option>
              <option value="no_show">미출석</option>
              <option value="withdrawn">철회</option>
              <option value="disqualified">실격</option>
            </select>
          </label>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={resetFilters}
            >
              필터 초기화
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={listRef}>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border px-4 py-8 text-center text-sm">
            {rows.length === 0
              ? "표시할 승인 신청자가 없습니다."
              : "검색 결과가 없습니다."}
          </p>
        ) : (
          <OrganizerFieldStatusTable rows={filtered} onOpenDetail={openDetail} />
        )}
      </div>

      <OrganizerFieldStatusDetailDrawer
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
