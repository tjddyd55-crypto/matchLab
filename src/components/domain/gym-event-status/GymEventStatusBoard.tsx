"use client";

import { useMemo, useRef, useState } from "react";
import { GymEventMatchesSection } from "@/components/domain/gym-event-status/GymEventMatchesSection";
import { GymEventStatusCards } from "@/components/domain/gym-event-status/GymEventStatusCards";
import { GymEventStatusDetailDrawer } from "@/components/domain/gym-event-status/GymEventStatusDetailDrawer";
import { GymEventStatusSummaryCards } from "@/components/domain/gym-event-status/GymEventStatusSummaryCards";
import { GymEventStatusTable } from "@/components/domain/gym-event-status/GymEventStatusTable";
import {
  matchesGymEventStatusSummaryFilter,
  type GymEventStatusSummaryFilter,
} from "@/lib/gym-event-status-filters";
import type { GymEventStatusPageDTO } from "@/lib/services/gym-event-status.service";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: GymEventStatusSummaryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "신청 대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
  { value: "field_pending", label: "현장 미확인" },
  { value: "weigh_fail", label: "계체 실패" },
  { value: "eligible", label: "출전 확정" },
  { value: "bracket_assigned", label: "대진 배정됨" },
  { value: "bracket_unassigned", label: "미배정" },
];

export function GymEventStatusBoard({ data }: { data: GymEventStatusPageDTO }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [summaryFilter, setSummaryFilter] =
    useState<GymEventStatusSummaryFilter>("all");
  const [search, setSearch] = useState("");
  const [detailRow, setDetailRow] =
    useState<(typeof data.rows)[number] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (!matchesGymEventStatusSummaryFilter(row, summaryFilter)) return false;
      if (!q) return true;
      return (
        row.fighterName.toLowerCase().includes(q) ||
        row.divisionLabel.toLowerCase().includes(q)
      );
    });
  }, [data.rows, summaryFilter, search]);

  const selectClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm";

  function handleSummaryFilterChange(filter: GymEventStatusSummaryFilter) {
    setSummaryFilter(filter);
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openDetail(row: (typeof data.rows)[number]) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <GymEventStatusSummaryCards
        summary={data.summary}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          <span className="text-muted-foreground">선수명·부문 검색</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="선수명 또는 부문/체급"
            className={cn(selectClass, "w-full")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">필터</span>
          <select
            className={cn(selectClass, "min-w-[10rem]")}
            value={summaryFilter}
            onChange={(e) =>
              handleSummaryFilterChange(
                e.target.value as GymEventStatusSummaryFilter,
              )
            }
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={listRef} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">신청 현황</h2>
        <GymEventStatusTable rows={filtered} onOpenDetail={openDetail} />
        <GymEventStatusCards rows={filtered} onOpenDetail={openDetail} />
      </div>

      <GymEventMatchesSection
        publicSlug={data.publicSlug}
        bracketGenerated={data.bracketGenerated}
        matches={data.matches}
        unassignedFighters={data.unassignedFighters}
      />

      <GymEventStatusDetailDrawer
        row={detailRow}
        publicSlug={data.publicSlug}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
