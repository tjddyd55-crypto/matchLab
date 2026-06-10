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
import { cn } from "@/lib/utils";

export function OrganizerFieldStatusBoard({
  rows,
  summary,
}: {
  rows: FieldStatusRowDTO[];
  summary: FieldStatusSummaryDTO;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
      if (!matchesFieldStatusSearchQuery(r, searchQuery)) return false;
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
  }, [rows, searchQuery, gymFilter, divisionFilter, checkInFilter, summaryFilter]);

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

  function openDetail(row: FieldStatusRowDTO) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  const emptyMessage =
    rows.length === 0
      ? "표시할 승인 신청자가 없습니다."
      : searchQuery.trim() || gymFilter !== "all" || divisionFilter !== "all" || checkInFilter !== "all" || summaryFilter !== "all"
        ? "검색 결과가 없습니다."
        : "표시할 승인 신청자가 없습니다.";

  return (
    <div className="flex flex-col gap-6">
      <FieldStatusSummaryCards
        summary={summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <div className="flex flex-col gap-3">
        <label className="flex w-full flex-col gap-1 text-xs">
          <span className="text-muted-foreground font-medium">선수 검색</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="선수명, 체육관, 부문, 체급으로 검색"
            className={cn(
              selectClass,
              "h-10 w-full px-3 text-sm md:max-w-md",
            )}
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
        </div>
      </div>

      <div ref={listRef}>
        <OrganizerFieldStatusTable
          rows={filtered}
          emptyMessage={emptyMessage}
          onOpenDetail={openDetail}
        />
      </div>

      <OrganizerFieldStatusDetailDrawer
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
