"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelGymMemberPortalClassAction,
  joinGymMemberPortalClassAction,
} from "@/features/gym-member-portal/member-actions";
import { Button } from "@/components/ui/button";

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
  action:
    | "join"
    | "waitlist"
    | "cancel_attending"
    | "cancel_waitlist"
    | "closed"
    | "none";
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

  const capacityLabel =
    item.capacity == null
      ? `${item.attendingCount}명 신청`
      : `${item.attendingCount} / ${item.capacity}명`;

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-xs text-[#64748B]">
        {item.dateKey} · {item.timeRangeLabel}
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
        {item.action === "join" ? (
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={runJoin}
          >
            참석하기
          </Button>
        ) : null}
        {item.action === "waitlist" ? (
          <Button
            type="button"
            className="min-h-11 w-full"
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
            className="min-h-11 w-full"
            disabled={pending}
            onClick={runCancel}
          >
            {item.action === "cancel_attending" ? "참석 취소" : "대기 취소"}
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
    </article>
  );
}
