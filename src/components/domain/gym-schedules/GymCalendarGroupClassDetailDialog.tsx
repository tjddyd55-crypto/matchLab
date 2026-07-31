"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";
import { cn } from "@/lib/utils";

/**
 * 캘린더에서 그룹수업 블록 클릭 시 상세 모달.
 * 페이지 이동 없이 배경 캘린더 상태를 유지한다.
 */
export function GymCalendarGroupClassDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: GymCalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
          <p>담당: {item.staffName || "미정"}</p>
          <p>
            상태: {item.statusLabel}
            {capacity ? ` · ${capacity}` : ""}
          </p>
          {item.waitlistCount != null && item.waitlistCount > 0 ? (
            <p>대기: {item.waitlistCount}명</p>
          ) : null}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link
            href={`/gym/group-classes/${item.id}`}
            className={cn(buttonVariants({ size: "default" }), "w-full sm:w-auto")}
          >
            상세 관리로 이동
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
