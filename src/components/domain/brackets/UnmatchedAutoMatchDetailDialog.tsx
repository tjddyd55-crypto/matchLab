"use client";

import { useEffect, useMemo, useState } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import type {
  AutoBracketCourtAssignmentSummary,
  AutoBracketPlannedMatchDetail,
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

function formatCandidateCount(count: number | undefined): string {
  if (count == null) return "0명";
  return `${count}명`;
}

function rowSearchBlob(row: AutoBracketUnmatchedDetail): string {
  return [
    row.fighterName,
    row.gymName,
    row.ageGroupLabel,
    row.weightClassLabel,
    row.divisionLabel,
    row.appliedWeightLabel,
    row.recordText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function UnmatchedRowCard({ row }: { row: AutoBracketUnmatchedDetail }) {
  return (
    <li className="rounded-lg border border-matchon-border bg-white px-3 py-3">
      <p className="font-medium text-matchon-text-primary">{row.fighterName}</p>
      <p className="mt-0.5 text-sm text-matchon-text-secondary">{row.gymName}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <dt className="text-muted-foreground">경기구분</dt>
          <dd className="text-matchon-text-primary">
            {row.ageGroupLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">체급</dt>
          <dd className="text-matchon-text-primary">
            {row.weightClassLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">신청체중</dt>
          <dd className="text-matchon-text-primary">
            {row.appliedWeightLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">전적</dt>
          <dd className="text-matchon-text-primary">
            {row.recordText ?? "전적 정보 없음"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">후보</dt>
          <dd className="tabular-nums text-matchon-text-primary">
            {formatCandidateCount(row.candidateCount)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 line-clamp-2 text-sm leading-snug break-keep text-matchon-text-primary">
        {row.reasonText ?? row.reasonLabel}
      </p>
      {row.candidateFlowText ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {row.candidateFlowText}
        </p>
      ) : null}
    </li>
  );
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
  plannedMatchDetails?: AutoBracketPlannedMatchDetail[];
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
  plannedMatchDetails = [],
  unmatchedDetails,
  applyFormId,
  applyPending = false,
  applyDisabled = false,
}: AutoBracketPreviewDialogProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    scheduleEffectStateUpdate(() => {
      setFilter("all");
      setQuery("");
    });
  }, [open, unmatchedDetails]);

  const filterCounts = useMemo(() => {
    const counts = new Map<(typeof FILTERS)[number]["id"], number>();
    for (const f of FILTERS) {
      counts.set(
        f.id,
        unmatchedDetails.filter((row) => matchesFilter(row, f.id)).length,
      );
    }
    return counts;
  }, [unmatchedDetails]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unmatchedDetails.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      return rowSearchBlob(row).includes(q);
    });
  }, [unmatchedDetails, filter, query]);

  const metrics = [
    { label: "전체 신청", value: `${totalFighterCount}명` },
    { label: "자동매칭", value: `${matchedFighterCount}명` },
    { label: "미매칭", value: `${unmatchedCount}명` },
    { label: "생성 예정 경기", value: `${plannedMatches}경기` },
    { label: "처리 경기구분", value: `${divisionsProcessed}개` },
  ];

  const warningLines = useMemo(() => {
    const lines: string[] = [
      `미리보기: ${plannedMatches}경기 생성 예정 · 미매칭 ${unmatchedCount}명`,
    ];
    for (const m of messages) {
      if (m.trim() && !lines.includes(m.trim())) lines.push(m.trim());
    }
    if (courtAssignments.length > 0) {
      lines.push(
        `경기장 배정 · ${courtAssignments
          .map((c) => `${c.courtLabel} ${c.assignedCount}경기`)
          .join(" · ")}`,
      );
    }
    return lines;
  }, [plannedMatches, unmatchedCount, messages, courtAssignments]);

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
              생성 예정 경기와 미매칭 선수의 사유를 확인할 수 있습니다.
            </DialogDescription>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-matchon-border bg-muted/30 px-3 py-2"
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-matchon-text-primary">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {warningLines.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <ul className="space-y-1">
                {warningLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={cn(formControlInlineRowClass, "gap-1.5")}>
            {FILTERS.map((f) => {
              const count = filterCounts.get(f.id) ?? 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium",
                    filter === f.id
                      ? "border-matchon-primary bg-matchon-primary/10 text-matchon-primary"
                      : "border-matchon-border bg-white text-matchon-text-secondary",
                  )}
                >
                  {f.label}
                  <span className="tabular-nums opacity-70">({count})</span>
                </button>
              );
            })}
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
          {plannedMatchDetails.length > 0 ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-matchon-text-secondary">
                생성 예정 경기 ({plannedMatchDetails.length})
              </p>
              <ul className="space-y-1.5">
                {plannedMatchDetails.map((m, idx) => {
                  const redW =
                    m.redWeightKg != null ? `${m.redWeightKg}kg` : "체중 정보 없음";
                  const blueW =
                    m.blueWeightKg != null
                      ? `${m.blueWeightKg}kg`
                      : "체중 정보 없음";
                  const diff =
                    m.weightDiffKg != null
                      ? `체중차 ${m.weightDiffKg}kg`
                      : "체중차 비교 불가";
                  return (
                    <li
                      key={`${m.redName}-${m.blueName}-${idx}`}
                      className="rounded-md border border-matchon-border bg-white px-3 py-2 text-xs"
                    >
                      <p className="text-muted-foreground">{m.divisionLabel}</p>
                      <p className="mt-0.5 text-sm text-matchon-text-primary">
                        {m.redName} {redW}
                        {" · "}
                        {m.blueName} {blueW}
                        {" · "}
                        {diff}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[88px]" />
                <col className="w-[120px]" />
                <col className="w-[100px]" />
                <col className="w-[110px]" />
                <col className="w-[64px]" />
                <col className="w-[110px]" />
                <col className="w-[52px]" />
                <col />
              </colgroup>
              <thead className="sticky top-0 z-[1] bg-popover text-xs text-matchon-text-secondary">
                <tr className="border-b border-matchon-border">
                  <th className="py-2 pr-2 font-medium">선수</th>
                  <th className="py-2 pr-2 font-medium">체육관</th>
                  <th className="py-2 pr-2 font-medium">경기구분</th>
                  <th className="py-2 pr-2 font-medium">체급</th>
                  <th className="py-2 pr-2 font-medium">신청체중</th>
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
                    <td className="py-3 pr-2">
                      {row.ageGroupLabel ?? "—"}
                    </td>
                    <td className="py-3 pr-2">
                      {row.weightClassLabel ?? "—"}
                    </td>
                    <td className="py-3 pr-2 tabular-nums">
                      {row.appliedWeightLabel ?? "—"}
                    </td>
                    <td className="py-3 pr-2">
                      {row.recordText ?? "전적 정보 없음"}
                    </td>
                    <td className="py-3 pr-2 text-center tabular-nums">
                      {formatCandidateCount(row.candidateCount)}
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
              <UnmatchedRowCard
                key={`${row.fighterName}-${row.gymName}-m-${idx}`}
                row={row}
              />
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
