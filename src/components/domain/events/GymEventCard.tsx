import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GymDashboardEventItemDTO } from "@/lib/services/event.service";

export function GymEventCard({ event }: { event: GymDashboardEventItemDTO }) {
  const regStart = new Date(event.registrationStartDate).toLocaleDateString(
    "ko-KR",
  );
  const regEnd = new Date(event.registrationEndDate).toLocaleDateString("ko-KR");
  const eventDay = new Date(event.eventDate).toLocaleDateString("ko-KR");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">{event.title}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span className="bg-muted rounded px-2 py-0.5 font-normal">
            {event.listingBadgeLabel}
          </span>
          <span>
            주최 {event.organizerName} · 부문 {event.divisionCount}개
            {!event.hasPaymentSetting ? " · 입금 미설정" : ""}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>대회일</dt>
            <dd className="text-foreground">{eventDay}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>신청 기간</dt>
            <dd className="text-right text-foreground">
              {regStart} ~ {regEnd}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>대회 상태</dt>
            <dd className="text-foreground">{event.statusLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>신청</dt>
            <dd
              className={cn(
                "text-right font-medium",
                event.canApply ? "text-primary" : "text-foreground",
              )}
            >
              {event.registrationStatusLabel}
            </dd>
          </div>
          {(event.liveStreamingEnabled || event.streamingConsentRequired) ? (
            <div className="rounded-md bg-amber-950/15 px-2 py-1 text-amber-950 dark:text-amber-100">
              촬영·스트리밍 안내 및 동의가 필요할 수 있습니다.
            </div>
          ) : null}
        </dl>
        {event.applyDisabledReason && !event.canApply ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {event.applyDisabledReason}
          </p>
        ) : null}
        <Link
          href={`/events/${event.publicSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex w-full justify-center",
          )}
        >
          공개 공고 보기
        </Link>
        {event.canApply ? (
          <Link
            href={`/gym/events/${event.id}/apply`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex w-full justify-center",
            )}
          >
            신청하기
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex w-full cursor-not-allowed justify-center opacity-80",
            )}
            aria-disabled
          >
            신청 불가
          </span>
        )}
      </CardContent>
    </Card>
  );
}
