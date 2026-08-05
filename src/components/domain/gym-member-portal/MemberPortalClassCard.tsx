"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelGymMemberPortalClassAction,
  joinGymMemberPortalClassAction,
} from "@/features/gym-member-portal/member-actions";
import { Button } from "@/components/ui/button";
import type { MemberPortalGroupClassItem } from "@/lib/gym-member-portal/class-types";

export type MemberPortalClassCardData = Pick<
  MemberPortalGroupClassItem,
  | "id"
  | "title"
  | "dateKey"
  | "dateLabel"
  | "timeRangeLabel"
  | "instructorName"
  | "location"
  | "capacity"
  | "attendingCount"
  | "waitlistCount"
  | "statusLabel"
  | "action"
  | "myWaitlistOrder"
  | "isMine"
>;

function capacityLabel(item: MemberPortalClassCardData): string {
  if (item.capacity == null) {
    return `${item.attendingCount}명 신청`;
  }
  return `신청 ${item.attendingCount} / ${item.capacity}명`;
}

export function MemberPortalClassActions({
  token,
  item,
  compact = false,
}: {
  token: string;
  item: Pick<MemberPortalClassCardData, "id" | "action">;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    const confirmMessage =
      item.action === "cancel_attending"
        ? "참석 신청을 취소할까요?"
        : "대기 신청을 취소할까요?";
    if (!window.confirm(confirmMessage)) return;

    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("classId", item.id);
    startTransition(async () => {
      const result = await cancelGymMemberPortalClassAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(result.data.message);
      router.refresh();
    });
  }

  const btnClass = compact ? "min-h-10 flex-1" : "min-h-11 w-full";

  return (
    <div>
      <div className={compact ? "flex gap-2" : undefined}>
        {item.action === "join" ? (
          <Button
            type="button"
            className={btnClass}
            disabled={pending}
            onClick={runJoin}
          >
            참석 신청
          </Button>
        ) : null}
        {item.action === "waitlist" ? (
          <Button
            type="button"
            className={btnClass}
            disabled={pending}
            onClick={runJoin}
          >
            대기 신청
          </Button>
        ) : null}
        {item.action === "cancel_attending" ||
        item.action === "cancel_waitlist" ? (
          <Button
            type="button"
            variant="outline"
            className={btnClass}
            disabled={pending}
            onClick={runCancel}
          >
            신청 취소
          </Button>
        ) : null}
        {item.action === "closed" ? (
          <p className="min-h-10 flex-1 rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-center text-sm text-[#64748B]">
            신청 불가
          </p>
        ) : null}
      </div>
      {message ? (
        <p className="mt-2 text-sm text-[#0A47FF]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-2 whitespace-pre-line text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function MemberPortalClassCard({
  token,
  item,
  onOpenDetail,
  showDate = true,
}: {
  token: string;
  item: MemberPortalClassCardData;
  onOpenDetail?: () => void;
  showDate?: boolean;
}) {
  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <button
        type="button"
        className="w-full text-left"
        onClick={onOpenDetail}
        disabled={!onOpenDetail}
      >
        <p className="text-xs text-[#64748B]">
          {showDate ? `${item.dateLabel} · ` : null}
          {item.timeRangeLabel}
        </p>
        <h3 className="mt-1 truncate text-base font-semibold text-[#0F172A]">
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-[#64748B]">
          {item.instructorName
            ? `담당 강사: ${item.instructorName}`
            : "담당 강사 미지정"}
          {item.location ? ` · ${item.location}` : ""}
        </p>
        <p className="mt-2 text-sm text-[#0F172A]">
          {capacityLabel(item)}
          {item.waitlistCount > 0 ? ` · 대기 ${item.waitlistCount}명` : ""}
        </p>
        <p className="mt-1 text-sm font-medium text-[#001C7A]">
          {item.statusLabel}
        </p>
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        {onOpenDetail ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 flex-1"
            onClick={onOpenDetail}
          >
            수업 보기
          </Button>
        ) : null}
        {item.action !== "closed" && item.action !== "none" ? (
          <div className={onOpenDetail ? "min-w-[46%] flex-1" : "w-full"}>
            <MemberPortalClassActions
              token={token}
              item={item}
              compact={Boolean(onOpenDetail)}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
