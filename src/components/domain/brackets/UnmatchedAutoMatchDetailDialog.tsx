"use client";

import { useMemo, useState } from "react";
import type { AutoBracketUnmatchedDetail } from "@/lib/services/bracket-auto-match.service";
import type { UnmatchedDetailReasonCode } from "@/lib/brackets/explain-record-unmatched";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FILTERS: Array<{
  id: "all" | UnmatchedDetailReasonCode | "other_group";
  label: string;
  codes?: UnmatchedDetailReasonCode[];
}> = [
  { id: "all", label: "전체" },
  {
    id: "no_candidate",
    label: "상대 없음",
    codes: ["no_candidate", "no_zero_candidate"],
  },
  { id: "same_gym", label: "같은 체육관", codes: ["same_gym"] },
  { id: "record_diff", label: "전적 차이", codes: ["record_diff"] },
  { id: "age_grade", label: "연령/학년", codes: ["age_grade"] },
  {
    id: "other_group",
    label: "기타",
    codes: [
      "unknown_record",
      "not_eligible",
      "court_capacity",
      "odd_remaining",
      "other",
    ],
  },
];

function matchesFilter(
  row: AutoBracketUnmatchedDetail,
  filterId: (typeof FILTERS)[number]["id"],
): boolean {
  if (filterId === "all") return true;
  const def = FILTERS.find((f) => f.id === filterId);
  if (!def?.codes) return row.reasonCode === filterId;
  return def.codes.includes(row.reasonCode);
}

export function UnmatchedAutoMatchDetailDialog({
  open,
  onOpenChange,
  unmatchedDetails,
  matchedFighterCount,
  unmatchedCount,
  totalFighterCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmatchedDetails: AutoBracketUnmatchedDetail[];
  matchedFighterCount: number;
  unmatchedCount: number;
  totalFighterCount: number;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unmatchedDetails.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      return (
        row.fighterName.toLowerCase().includes(q) ||
        row.gymName.toLowerCase().includes(q)
      );
    });
  }, [unmatchedDetails, filter, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-4 py-4 sm:px-5">
          <DialogTitle>자동대진 미매칭 상세</DialogTitle>
          <DialogDescription>
            매칭되지 않은 선수와 제외 사유를 확인할 수 있습니다.
          </DialogDescription>
          <p className="text-sm text-matchon-text-secondary">
            전체 {totalFighterCount}명 · 자동매칭 {matchedFighterCount}명 ·
            미매칭 {unmatchedCount}명
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium",
                  filter === f.id
                    ? "border-matchon-primary bg-matchon-primary/10 text-matchon-primary"
                    : "border-matchon-border bg-white text-matchon-text-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="선수명 / 체육관 검색"
            className="mt-1 h-9 w-full rounded-md border border-matchon-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
          />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {/* PC table */}
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-popover text-xs text-matchon-text-secondary">
                <tr className="border-b border-matchon-border">
                  <th className="w-[12%] py-2 pr-2 font-medium">선수</th>
                  <th className="w-[16%] py-2 pr-2 font-medium">체육관</th>
                  <th className="w-[10%] py-2 pr-2 font-medium">경기구분</th>
                  <th className="w-[10%] py-2 pr-2 font-medium">체급</th>
                  <th className="w-[12%] py-2 pr-2 font-medium">전적</th>
                  <th className="w-[8%] py-2 pr-2 font-medium">후보</th>
                  <th className="w-[32%] py-2 font-medium">미매칭 사유</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.fighterName}-${row.gymName}-${idx}`}
                    className="border-b border-matchon-border/70 align-top"
                  >
                    <td className="py-2.5 pr-2 font-medium text-matchon-text-primary">
                      {row.fighterName}
                    </td>
                    <td className="py-2.5 pr-2 break-words text-matchon-text-secondary">
                      {row.gymName}
                    </td>
                    <td className="py-2.5 pr-2">{row.ageGroupLabel}</td>
                    <td className="py-2.5 pr-2">{row.weightClassLabel}</td>
                    <td className="py-2.5 pr-2">{row.recordText}</td>
                    <td className="py-2.5 pr-2">{row.candidateCount}명</td>
                    <td className="py-2.5">
                      <p className="whitespace-pre-wrap break-words text-matchon-text-primary">
                        {row.reasonText}
                      </p>
                      <p className="mt-1 text-xs text-matchon-text-secondary">
                        {row.candidateFlowText}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row, idx) => (
              <li
                key={`${row.fighterName}-${row.gymName}-m-${idx}`}
                className="rounded-lg border border-matchon-border bg-white px-3 py-3"
              >
                <p className="font-medium text-matchon-text-primary">
                  {row.fighterName}
                  <span className="text-matchon-text-secondary">
                    {" "}
                    · {row.gymName}
                  </span>
                </p>
                <p className="mt-1 text-xs text-matchon-text-secondary">
                  {row.ageGroupLabel} / {row.weightClassLabel} · {row.recordText}
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap break-words">
                  {row.reasonText}
                </p>
                <p className="mt-1 text-xs text-matchon-text-secondary">
                  {row.candidateFlowText}
                </p>
              </li>
            ))}
          </ul>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-matchon-text-secondary">
              조건에 맞는 미매칭 선수가 없습니다.
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
