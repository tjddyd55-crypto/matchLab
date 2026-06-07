"use client";

import Link from "next/link";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { buttonVariants } from "@/components/ui/button";
import type { EventStaffLinkListItemVM } from "@/lib/services/event-staff-access.service";
import { cn } from "@/lib/utils";

export function OrganizerOperationStaffLinkBanner({
  eventId,
  baseUrl,
  links,
}: {
  eventId: string;
  baseUrl: string;
  links: EventStaffLinkListItemVM[];
}) {
  const root = baseUrl.replace(/\/$/, "");
  const activeLinks = links.filter((l) => !l.revokedAt);

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">스태프 결과 입력 링크</p>
          <p className="text-muted-foreground">
            현장 스태프는 계정 없이 모바일에서 결과만 입력할 수 있습니다. 링크
            발급·권한 설정은 행사 상세에서 관리합니다.
          </p>
        </div>
        <Link
          href={`/organizer/events/${eventId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          링크 발급·관리
        </Link>
      </div>

      {activeLinks.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {activeLinks.slice(0, 3).map((link) => {
            const staffUrl = `${root}/staff/result/${link.token}/matches`;
            return (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-muted-foreground text-xs">
                    토큰 …{link.tokenPreviewSuffix}
                  </p>
                </div>
                <CopyInviteUrlButton url={staffUrl} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          활성 링크가 없습니다. 행사 상세에서 스태프 링크를 생성해 주세요.
        </p>
      )}
    </section>
  );
}
