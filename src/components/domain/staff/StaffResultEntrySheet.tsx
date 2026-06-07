"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaffMatchResultForm } from "@/components/domain/staff/StaffMatchResultForm";
import type { StaffEventMatchListItemVM } from "@/lib/staff-match-display";
import { cn } from "@/lib/utils";

export function StaffResultEntrySheet({
  match,
  open,
  onOpenChange,
  mode,
  staffToken,
  canRecordOutcomeDraft,
  canConfirmResult,
}: {
  match: StaffEventMatchListItemVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "entry" | "edit" | "view";
  staffToken: string;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
}) {
  if (!match) return null;

  const title =
    mode === "view"
      ? "결과 확인"
      : mode === "edit"
        ? "결과 수정"
        : "결과 입력";

  const fighterA = match.fighterRed?.name ?? "미배정";
  const fighterB = match.fighterBlue?.name ?? "미배정";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed inset-x-0 bottom-0 top-auto max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 p-0 sm:max-w-lg sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-xl sm:border-b sm:border-l",
          "data-open:slide-in-from-bottom sm:data-open:slide-in-from-right",
          "data-closed:slide-out-to-bottom sm:data-closed:slide-out-to-right",
        )}
      >
        <div className="flex max-h-[88vh] flex-col overflow-hidden sm:max-h-none sm:h-full">
          <DialogHeader className="shrink-0 border-b px-4 py-4 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              경기 {match.orderLabel} · {match.divisionLabel ?? "부문 미상"} ·{" "}
              {fighterA} vs {fighterB}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
            <StaffMatchResultForm
              match={match}
              staffToken={staffToken}
              canRecordOutcomeDraft={canRecordOutcomeDraft}
              canConfirmResult={canConfirmResult}
              mode={mode}
              onSuccess={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
