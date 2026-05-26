"use client";

import { useMemo, useState } from "react";
import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";
import { FieldStatusSummaryCards } from "@/components/domain/field-status/FieldStatusSummaryCards";
import { OrganizerFieldStatusTable } from "@/components/domain/field-status/OrganizerFieldStatusTable";
import type { FieldStatusSummaryDTO } from "@/lib/services/field-status.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OrganizerFieldStatusBoard({
  rows,
  summary,
}: {
  rows: FieldStatusRowDTO[];
  summary: FieldStatusSummaryDTO;
}) {
  const [gymFilter, setGymFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);

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
      if (gymFilter !== "all" && r.gymId !== gymFilter) return false;
      if (divisionFilter !== "all" && r.divisionId !== divisionFilter)
        return false;
      if (checkInFilter !== "all" && r.checkInStatus !== checkInFilter)
        return false;
      if (eligibleOnly && !r.isEligibleForBracket) return false;
      return true;
    });
  }, [rows, gymFilter, divisionFilter, checkInFilter, eligibleOnly]);

  const selectClass =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm";

  return (
    <div className="flex flex-col gap-6">
      <FieldStatusSummaryCards summary={summary} />

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
            className={selectClass}
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
          >
            <option value="all">전체</option>
            <option value="pending">미확인</option>
            <option value="checked_in">현장 확인</option>
            <option value="no_show">미출석</option>
            <option value="withdrawn">철회</option>
            <option value="disqualified">실격</option>
          </select>
        </label>
        <Button
          type="button"
          variant={eligibleOnly ? "default" : "outline"}
          size="sm"
          className={cn("h-9")}
          onClick={() => setEligibleOnly((v) => !v)}
        >
          {eligibleOnly ? "출전 확정만 보기 ✓" : "출전 확정만 보기"}
        </Button>
      </div>

      <OrganizerFieldStatusTable rows={filtered} />
    </div>
  );
}
