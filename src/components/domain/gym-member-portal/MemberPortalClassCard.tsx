"use client";

/**
 * 레거시 카드 — 달력 상세 모달과 동일 action/문구 SSOT를 사용한다.
 * 신규 화면은 MemberPortalClassListCard + MemberPortalClassDetailDialog 를 우선한다.
 */
import { useState, useTransition } from "react";
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
  formatPortalClassCapacity,
  formatPortalTimeRangeLabel,
  PORTAL_CLASS_ACTION_LABEL,
  type PortalClassAction,
} from "@/lib/gym-member-portal/class-display";

export type MemberPortalClassCardData = {
  id: string;
  title: string;
  dateKey: string;
  timeRangeLabel: string;
  instructorName: string | null;
  location: string | null;
  capacity: number | null;
  attendingCount: number;
  waitlistCount: number;
  statusLabel: string;
  action: PortalClassAction;
  myWaitlistOrder: number | null;
};

export function MemberPortalClassCard({
  token,
  item,
}: {
  token: string;
  item: MemberPortalClassCardData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function runJoin() {
    setError(null);
    setMessage(null);
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

  function runCancel() {
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("classId", item.id);
    startTransition(async () => {
      const result = await cancelGymMemberPortalClassAction(fd);
      setConfirmOpen(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(result.data.message);
      router.refresh();
    });
  }

  const capacityLabel = formatPortalClassCapacity(
    item.attendingCount,
    item.capacity,
  );

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-xs text-[#64748B]">
        {item.dateKey} · {formatPortalTimeRangeLabel(item.timeRangeLabel)}
      </p>
      <h3 className="mt-1 text-base font-semibold text-[#0F172A] break-keep">
        {item.title}
      </h3>
      <p className="mt-1 text-sm text-[#64748B]">
        {item.instructorName
          ? `${item.instructorName} 선생님`
          : "담당 선생님 미지정"}
        {item.location ? ` · ${item.location}` : ""}
      </p>
      <p className="mt-2 text-sm text-[#0F172A]">
        {capacityLabel}
        {item.waitlistCount > 0 ? ` · 대기 ${item.waitlistCount}명` : ""}
      </p>
      <p className="mt-1 text-sm font-medium text-[#001C7A]">{item.statusLabel}</p>

      <div className="mt-3">
        {item.action === "join" || item.action === "waitlist" ? (
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={runJoin}
          >
            {PORTAL_CLASS_ACTION_LABEL[item.action]}
          </Button>
        ) : null}
        {item.action === "cancel_attending" ||
        item.action === "cancel_waitlist" ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            {PORTAL_CLASS_ACTION_LABEL[item.action]}
          </Button>
        ) : null}
        {item.action === "closed" ? (
          <p className="min-h-11 rounded-lg bg-[#F8FAFC] px-3 py-3 text-center text-sm text-[#64748B]">
            신청 마감
          </p>
        ) : null}
      </div>

      {message ? (
        <p className="mt-2 text-sm text-[#0A47FF]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-2 whitespace-pre-line text-sm text-red-600">{error}</p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {item.action === "cancel_attending"
                ? "참석 신청을 취소할까요?"
                : "대기 신청을 취소할까요?"}
            </DialogTitle>
            {item.action === "cancel_attending" ? (
              <DialogDescription>
                취소하면 대기 중인 다른 회원이 자동으로 참석 처리될 수 있습니다.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={runCancel}
            >
              {item.action === "cancel_attending" ? "참석 취소" : "대기 취소"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
