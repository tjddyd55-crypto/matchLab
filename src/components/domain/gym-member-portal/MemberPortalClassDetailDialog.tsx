"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelGymMemberPortalClassAction,
  joinGymMemberPortalClassAction,
} from "@/features/gym-member-portal/member-actions";
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
  formatPortalTimeRangeLabel,
  PORTAL_CLASS_ACTION_LABEL,
  type PortalClassAction,
} from "@/lib/gym-member-portal/class-display";
import type { PortalGroupClassItem } from "@/lib/gym-member-portal/portal-class-types";
import { cn } from "@/lib/utils";

type CancelKind = "cancel_attending" | "cancel_waitlist" | null;

export function MemberPortalClassDetailDialog({
  token,
  item,
  open,
  onOpenChange,
}: {
  token: string;
  item: PortalGroupClassItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelKind, setCancelKind] = useState<CancelKind>(null);

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  function runJoin() {
    if (!item) return;
    resetFeedback();
    const fd = new FormData();
    fd.set("token", token);
    fd.set("classId", item.id);
    startTransition(async () => {
      const result = await joinGymMemberPortalClassAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(result.data.message);
      router.refresh();
    });
  }

  function runCancelConfirmed() {
    if (!item || !cancelKind) return;
    resetFeedback();
    const fd = new FormData();
    fd.set("token", token);
    fd.set("classId", item.id);
    startTransition(async () => {
      const result = await cancelGymMemberPortalClassAction(fd);
      setCancelKind(null);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(result.data.message);
      router.refresh();
    });
  }

  const action = item?.action ?? "none";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            resetFeedback();
            setCancelKind(null);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent
          className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-md"
          data-testid="member-portal-class-detail-dialog"
        >
          <DialogHeader>
            <DialogTitle>{item?.title ?? "그룹수업"}</DialogTitle>
            <DialogDescription className="sr-only">
              그룹수업 상세 및 참석 신청
            </DialogDescription>
          </DialogHeader>

          {item ? (
            <div className="space-y-2 text-sm text-[#0F172A]">
              <p className="text-[#64748B]">
                {item.dateKey} · {formatPortalTimeRangeLabel(item.timeRangeLabel)}
              </p>
              <p>
                {item.instructorName
                  ? `${item.instructorName} 선생님`
                  : "담당 선생님 미지정"}
              </p>
              {item.location ? <p>{item.location}</p> : null}
              {item.description ? (
                <p className="whitespace-pre-wrap break-keep text-[#334155]">
                  {item.description}
                </p>
              ) : null}
              <p>{item.capacityLabel}</p>
              {item.waitlistedCount > 0 ? (
                <p className="text-[#64748B]">대기 {item.waitlistedCount}명</p>
              ) : null}
              <p className="font-medium text-[#001C7A]">{item.statusLabel}</p>
              {item.myParticipationStatus === "waitlisted" &&
              item.waitlistOrderLabel ? (
                <p className="font-medium text-amber-700">
                  {item.waitlistOrderLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {action === "join" || action === "waitlist" ? (
              <Button
                type="button"
                className="min-h-11 w-full"
                disabled={pending || !item}
                onClick={runJoin}
              >
                {PORTAL_CLASS_ACTION_LABEL[action]}
              </Button>
            ) : null}
            {action === "cancel_attending" || action === "cancel_waitlist" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={pending || !item}
                onClick={() => setCancelKind(action)}
              >
                {PORTAL_CLASS_ACTION_LABEL[action]}
              </Button>
            ) : null}
            {action === "closed" ? (
              <p className="min-h-11 rounded-lg bg-[#F8FAFC] px-3 py-3 text-center text-sm text-[#64748B]">
                {item?.statusLabel === "수업 취소" ||
                item?.statusLabel === "수업 완료"
                  ? item.statusLabel
                  : "신청 마감"}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
            {message ? (
              <p className="text-center text-sm text-[#0A47FF]">{message}</p>
            ) : null}
            {error ? (
              <p className="whitespace-pre-line text-center text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelKind != null}
        onOpenChange={(next) => {
          if (!next) setCancelKind(null);
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-testid="member-portal-class-cancel-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {cancelKind === "cancel_attending"
                ? "참석 신청을 취소할까요?"
                : "대기 신청을 취소할까요?"}
            </DialogTitle>
            {cancelKind === "cancel_attending" ? (
              <DialogDescription>
                취소하면 대기 중인 다른 회원이 자동으로 참석 처리될 수 있습니다.
              </DialogDescription>
            ) : (
              <DialogDescription>
                대기 신청만 취소되며, 다른 회원 정보는 표시되지 않습니다.
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCancelKind(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={runCancelConfirmed}
            >
              {cancelKind === "cancel_attending" ? "참석 취소" : "대기 취소"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberPortalClassListCard({
  item,
  onOpen,
}: {
  item: PortalGroupClassItem;
  onOpen: () => void;
}) {
  const actionLabel =
    item.action === "join" ||
    item.action === "waitlist" ||
    item.action === "cancel_attending" ||
    item.action === "cancel_waitlist"
      ? PORTAL_CLASS_ACTION_LABEL[item.action]
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-xl border border-[#E2E8F0] bg-white p-4 text-left",
        "transition-colors hover:border-[#0A47FF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]",
      )}
      data-testid="member-portal-class-card"
      data-class-id={item.id}
    >
      <h3 className="text-base font-semibold text-[#0F172A] break-keep">
        {item.title}
      </h3>
      <p className="mt-1 text-sm text-[#64748B]">
        {formatPortalTimeRangeLabel(item.timeRangeLabel)}
      </p>
      <p className="mt-1 text-sm text-[#64748B]">
        {item.instructorName
          ? `${item.instructorName} 선생님`
          : "담당 선생님 미지정"}
      </p>
      {item.location ? (
        <p className="mt-0.5 text-sm text-[#64748B]">{item.location}</p>
      ) : null}
      <p className="mt-2 text-sm text-[#0F172A]">{item.capacityLabel}</p>
      <p className="mt-1 text-sm font-medium text-[#001C7A]">
        {item.statusLabel}
        {item.myParticipationStatus === "waitlisted" && item.waitlistOrderLabel
          ? ` · ${item.waitlistOrderLabel}`
          : ""}
      </p>
      {actionLabel ? (
        <span className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#0A47FF] px-3 text-sm font-medium text-white">
          {actionLabel}
        </span>
      ) : (
        <span className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#F8FAFC] px-3 text-sm text-[#64748B]">
          {item.statusLabel === "수업 취소" || item.statusLabel === "수업 완료"
            ? item.statusLabel
            : "신청 마감"}
        </span>
      )}
    </button>
  );
}

export type { PortalClassAction };
