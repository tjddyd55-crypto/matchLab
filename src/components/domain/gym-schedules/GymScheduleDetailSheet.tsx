"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  cancelGymScheduleAction,
  completeGymScheduleAction,
  markGymScheduleNoShowAction,
} from "@/features/gym-schedules/actions";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import type { GymScheduleVM } from "@/lib/services/gym-schedule.service";
import { cn } from "@/lib/utils";

export function GymScheduleDetailSheet({
  item,
  open,
  onOpenChange,
  onEdit,
  onChanged,
}: {
  item: GymScheduleVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmMode, setConfirmMode] = useState<
    null | "complete" | "no_show" | "cancel"
  >(null);

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>일정</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  function runAction() {
    if (!item || !confirmMode) return;
    setError(null);
    startTransition(async () => {
      let result;
      if (confirmMode === "complete") {
        result = await completeGymScheduleAction(item.id);
      } else if (confirmMode === "no_show") {
        result = await markGymScheduleNoShowAction(item.id);
      } else {
        const fd = new FormData();
        fd.set("reason", cancelReason);
        result = await cancelGymScheduleAction(item.id, fd);
      }
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setConfirmMode(null);
      onChanged();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>일정 상세</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-3">
          <GymMemberAvatar
            name={item.memberName}
            src={item.memberProfileImageUrl}
            className="size-12"
          />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-semibold">{item.memberName}</p>
            <p className="text-matchon-text-secondary">
              {item.staffName}
              {item.staffTitle ? ` · ${item.staffTitle}` : ""}
            </p>
            <p>
              {item.dateKey} · {item.timeRangeLabel}
            </p>
            <p>
              {item.scheduleTypeLabel} · {item.statusLabel}
            </p>
            {item.location ? <p>장소: {item.location}</p> : null}
            {item.memo ? (
              <p className="whitespace-pre-wrap text-matchon-text-secondary">
                {item.memo}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {confirmMode ? (
          <div className="space-y-2 rounded-lg border border-matchon-border p-3">
            <p className="text-sm font-medium">
              {confirmMode === "complete"
                ? "이 일정을 완료 처리할까요?"
                : confirmMode === "no_show"
                  ? "노쇼로 처리할까요?"
                  : "이 일정을 취소할까요?"}
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
                <Button type="button" size="sm" onClick={onEdit}>
                  수정
                </Button>
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
                  variant="outline"
                  onClick={() => setConfirmMode("no_show")}
                >
                  노쇼 처리
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmMode("cancel")}
                >
                  취소
                </Button>
              </div>
            ) : null}
            {item.canManage &&
            (item.status === "completed" || item.status === "no_show") ? (
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                보정 수정
              </Button>
            ) : null}
            <Link
              href={`/gym/members/${item.gymMemberId}`}
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0")}
            >
              회원 상세 보기
            </Link>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
