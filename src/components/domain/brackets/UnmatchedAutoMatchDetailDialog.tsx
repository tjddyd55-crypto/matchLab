"use client";

import type {
  AutoBracketCourtAssignmentSummary,
  AutoBracketUnmatchedDetail,
} from "@/lib/services/bracket-auto-match.service";
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
  const metrics = [
    { label: "생성 예정", value: `${plannedMatches}경기` },
    { label: "미매칭 선수", value: `${unmatchedCount}명` },
    { label: "처리 경기구분", value: `${divisionsProcessed}개` },
    { label: "자동매칭", value: `${matchedFighterCount}명` },
    { label: "전체", value: `${totalFighterCount}명` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          "!w-[min(960px,calc(100vw-2rem))] !max-w-[960px] sm:!max-w-[960px]",
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-matchon-border px-5 py-4 text-left">
          <div className="space-y-1.5 pr-8">
            <DialogTitle className="text-base font-semibold sm:text-lg">
              자동매칭 미리보기
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              생성 예정 경기와 미매칭 선수 사유를 확인한 뒤 적용하세요.
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
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
          <p className="mb-2 text-sm font-medium text-matchon-text-primary">
            미매칭 · 제외 상세
          </p>
          {unmatchedDetails.length === 0 ? (
            <p className="py-8 text-center text-sm text-matchon-text-secondary">
              미매칭 선수가 없습니다. 생성 예정 경기만 요약에 표시됩니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {unmatchedDetails.map((row, idx) => (
                <li
                  key={`${row.fighterName}-${row.gymName}-${idx}`}
                  className="rounded-md border border-matchon-border px-3 py-2 text-sm"
                >
                  <p className="font-medium text-matchon-text-primary">
                    {row.fighterName}
                    <span className="text-matchon-text-secondary">
                      {" "}
                      ({row.gymName})
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-matchon-text-secondary">
                    {row.divisionLabel}
                  </p>
                  <p className="mt-1 leading-snug break-keep">
                    {row.reasonLabel}
                  </p>
                </li>
              ))}
            </ul>
          )}
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
