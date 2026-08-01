"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  cancelGymGroupClassAction,
  completeGymGroupClassAction,
} from "@/features/gym-group-classes/actions";
import { durationLabel } from "@/lib/gym-schedule/board-geometry";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

/**
 * 캘린더에서 그룹수업 블록 클릭 시 상세 모달.
 * 페이지 이동 없이 배경 캘린더 상태를 유지한다. dismissible=false SSOT.
 */
export function GymCalendarGroupClassDetailDialog({
  item,
  open,
  onOpenChange,
  onChanged,
}: {
  item: GymCalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<null | "complete" | "cancel">(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");

  if (!item || item.itemType !== "group_class") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>그룹수업</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const capacity =
    item.capacity == null
      ? item.participantCount != null
        ? `${item.participantCount}명 참석`
        : null
      : `${item.participantCount ?? 0}/${item.capacity}명`;

  function runAction() {
    if (!item || !confirmMode) return;
    setError(null);
    startTransition(async () => {
      let result;
      if (confirmMode === "complete") {
        result = await completeGymGroupClassAction(item.id);
      } else {
        const fd = new FormData();
        fd.set("reason", cancelReason);
        result = await cancelGymGroupClassAction(item.id, fd);
      }
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setConfirmMode(null);
      onChanged?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>그룹수업 상세</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{item.title}</p>
          <p>
            {item.dateKey} · {item.timeRangeLabel}
          </p>
          <p>소요: {durationLabel(item.startsAt, item.endsAt)}</p>
          <p>담당: {item.staffName || "미정"}</p>
          <p>
            상태: {item.statusLabel}
            {capacity ? ` · ${capacity}` : ""}
          </p>
          {item.waitlistCount != null && item.waitlistCount > 0 ? (
            <p>대기: {item.waitlistCount}명</p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {confirmMode ? (
          <div className="space-y-2 rounded-lg border border-matchon-border p-3">
            <p className="text-sm font-medium">
              {confirmMode === "complete"
                ? "이 수업을 완료 처리할까요?"
                : "이 수업을 취소할까요?"}
            </p>
            {confirmMode === "cancel" ? (
              <textarea
                className={matchonFieldInputClass}
                placeholder="취소 사유 (선택)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
              />
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setConfirmMode(null)}
              >
                돌아가기
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={runAction}
              >
                확인
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {item.canManage && item.status === "scheduled" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmMode("complete")}
                >
                  완료 처리
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmMode("cancel")}
                >
                  수업 취소
                </Button>
              </div>
            ) : null}
            <Link
              href={`/gym/group-classes/${item.id}`}
              className={cn(
                buttonVariants({ size: "default" }),
                "w-full sm:w-auto",
              )}
            >
              참석자 관리
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
