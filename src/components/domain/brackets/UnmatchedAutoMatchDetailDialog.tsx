"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AutoBracketCourtAssignmentSummary,
  AutoBracketUnmatchedDetail,
} from "@/lib/services/bracket-auto-match.service";
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
import {
  formControlFieldClass,
  formControlInlineRowClass,
} from "@/lib/ui/form-control-ui";
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
  const code = row.reasonCode ?? "other";
  const def = FILTERS.find((f) => f.id === filterId);
  if (!def?.codes) return code === filterId;
  return def.codes.includes(code);
}

export type AutoBracketPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plannedMatches: number;
  matchedFighterCount: number;
  unmatchedCount: number;
  totalFighterCount: number;
  divisionsProcessed: number;
  courtAssignments?: AutoBracketCourtAssignmentSummary[];
  messages?: string[];
  unmatchedDetails: AutoBracketUnmatchedDetail[];
  /** 페이지의 적용 form id — Dialog footer 적용 버튼이 동일 handler 재사용 */
  applyFormId?: string;
  applyPending?: boolean;
  applyDisabled?: boolean;
};

export function AutoBracketPreviewDialog({
  open,
  onOpenChange,
  plannedMatches,
  matchedFighterCount,
  unmatchedCount,
  totalFighterCount,
  divisionsProcessed,
  courtAssignments = [],
  messages = [],
  unmatchedDetails,
  applyFormId,
  applyPending = false,
  applyDisabled = false,
}: AutoBracketPreviewDialogProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setFilter("all");
    setQuery("");
  }, [open, unmatchedDetails]);

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

  const metrics = [
    { label: "전체", value: `${totalFighterCount}명` },
    { label: "자동매칭", value: `${matchedFighterCount}명` },
    { label: "미매칭", value: `${unmatchedCount}명` },
    { label: "생성 예정", value: `${plannedMatches}경기` },
    { label: "처리 경기구분", value: `${divisionsProcessed}개` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          "!w-[min(1100px,calc(100vw-2rem))] !max-w-[1100px] sm:!max-w-[1100px]",
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-matchon-border px-5 py-4 text-left">
          <div className="space-y-1.5 pr-8">
            <DialogTitle className="text-base font-semibold sm:text-lg">
              자동매칭 미리보기
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              생성 예정 경기와 미매칭 선수의 상세 사유를 확인할 수 있습니다.
            </DialogDescription>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-matchon-border bg-muted/30 px-3 py-2.5">
            {metrics.map((m) => (
              <div key={m.label} className="min-w-[4.5rem]">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </p>
                <p className="text-sm font-semibold tabular-nums text-matchon-text-primary">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {courtAssignments.length > 0 ? (
            <div className="text-sm">
              <span className="font-medium text-matchon-text-primary">
                경기장 배정
              </span>
              <span className="text-muted-foreground"> · </span>
              <span className="text-matchon-text-secondary">
                {courtAssignments
                  .map((c) => `${c.courtLabel} ${c.assignedCount}경기`)
                  .join(" · ")}
              </span>
            </div>
          ) : null}

          {messages.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-100">
              {messages.map((m) => (
                <li key={m}>⚠ {m}</li>
              ))}
            </ul>
          ) : null}

          <div className={cn(formControlInlineRowClass, "gap-1.5")}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
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
            className={formControlFieldClass}
          />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[100px]" />
                <col className="w-[170px]" />
                <col className="w-[100px]" />
                <col className="w-[90px]" />
                <col className="w-[100px]" />
                <col className="w-[64px]" />
                <col />
              </colgroup>
              <thead className="sticky top-0 z-[1] bg-popover text-xs text-matchon-text-secondary">
                <tr className="border-b border-matchon-border">
                  <th className="py-2 pr-2 font-medium">선수</th>
                  <th className="py-2 pr-2 font-medium">체육관</th>
                  <th className="py-2 pr-2 font-medium">경기구분</th>
                  <th className="py-2 pr-2 font-medium">체급</th>
                  <th className="py-2 pr-2 font-medium">전적</th>
                  <th className="py-2 pr-2 text-center font-medium">후보</th>
                  <th className="py-2 font-medium">미매칭 사유</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.fighterName}-${row.gymName}-${idx}`}
                    className="border-b border-matchon-border/70 align-top"
                  >
                    <td className="py-3 pr-2 font-medium text-matchon-text-primary">
                      {row.fighterName}
                    </td>
                    <td className="py-3 pr-2 break-words text-matchon-text-secondary">
                      {row.gymName}
                    </td>
                    <td className="py-3 pr-2">{row.ageGroupLabel ?? "—"}</td>
                    <td className="py-3 pr-2">{row.weightClassLabel ?? "—"}</td>
                    <td className="py-3 pr-2">{row.recordText ?? "—"}</td>
                    <td className="py-3 pr-2 text-center tabular-nums">
                      {row.candidateCount ?? "—"}
                      {row.candidateCount != null ? "명" : ""}
                    </td>
                    <td className="py-3">
                      <p className="leading-snug break-keep text-matchon-text-primary">
                        {row.reasonText ?? row.reasonLabel}
                      </p>
                      {row.candidateFlowText ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.candidateFlowText}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  {[
                    row.ageGroupLabel,
                    row.weightClassLabel,
                    row.recordText,
                    row.candidateCount != null
                      ? `후보 ${row.candidateCount}명`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || row.divisionLabel}
                </p>
                <p className="mt-2 text-sm leading-snug break-keep">
                  {row.reasonText ?? row.reasonLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.candidateFlowText}
                </p>
              </li>
            ))}
          </ul>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-matchon-text-secondary">
              {unmatchedDetails.length === 0
                ? "미매칭 선수가 없습니다. 생성 예정 경기만 요약에 표시됩니다."
                : "조건에 맞는 미매칭 선수가 없습니다."}
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-matchon-border px-5 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          {applyFormId ? (
            <Button
              type="submit"
              form={applyFormId}
              size="default"
              disabled={applyDisabled || applyPending}
            >
              {applyPending ? "적용 중…" : "적용"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated 이름 호환 — AutoBracketPreviewDialog 사용 */
export const UnmatchedAutoMatchDetailDialog = AutoBracketPreviewDialog;
