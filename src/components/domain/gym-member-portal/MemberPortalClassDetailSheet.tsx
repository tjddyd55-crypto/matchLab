"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberPortalClassActions } from "@/components/domain/gym-member-portal/MemberPortalClassCard";
import type { MemberPortalGroupClassItem } from "@/lib/gym-member-portal/class-types";

function capacityLabel(item: MemberPortalGroupClassItem): string {
  if (item.capacity == null) {
    return `${item.attendingCount}명 신청`;
  }
  return `신청 현황 ${item.attendingCount} / ${item.capacity}명`;
}

export function MemberPortalClassDetailSheet({
  token,
  item,
  open,
  onOpenChange,
}: {
  token: string;
  item: MemberPortalGroupClassItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible>
      <DialogContent
        showCloseButton
        className="fixed inset-x-0 bottom-0 top-auto max-h-[85dvh] w-full max-w-lg translate-x-[-50%] left-1/2 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 p-0 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom"
      >
        <div className="flex max-h-[85dvh] flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <DialogHeader className="shrink-0 border-b px-4 py-4 text-left">
            <DialogTitle className="pr-8 break-keep text-[#001C7A]">
              {item.title}
            </DialogTitle>
            <DialogDescription className="text-[#64748B]">
              {item.dateLabel}
              <br />
              {item.timeRangeLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            <p className="text-sm text-[#0F172A]">
              {item.instructorName
                ? `${item.instructorName} 선생님`
                : "담당 강사 미지정"}
            </p>
            {item.location ? (
              <p className="text-sm text-[#64748B]">{item.location}</p>
            ) : null}
            <p className="text-sm font-medium text-[#0F172A]">
              {capacityLabel(item)}
              {item.waitlistCount > 0
                ? ` · 대기 ${item.waitlistCount}명`
                : ""}
            </p>
            <p className="text-sm font-semibold text-[#001C7A]">
              {item.statusLabel}
            </p>
            {item.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#475569]">
                {item.description}
              </p>
            ) : null}

            {item.action === "cancel_attending" ||
            item.action === "cancel_waitlist" ? (
              <p className="rounded-lg bg-[#F0F7FF] px-3 py-2 text-sm text-[#001C7A]">
                참석 신청이 완료되었습니다.
              </p>
            ) : null}

            <MemberPortalClassActions token={token} item={item} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
