import Link from "next/link";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { RegistrationStatusPill } from "@/components/domain/events/RegistrationStatusPill";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GymDashboardEventItemDTO } from "@/lib/services/event.service";
import {
  getGymListingBadgeLabel,
  resolveGymApplyStatusMatchonStatus,
  resolveGymListingBadgeMatchonStatus,
} from "@/lib/ui/gym-event-list-ui";
import { matchonCardStackClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ko-KR");
}

function formatRange(start: string, end: string): string {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export function GymEventCard({ event }: { event: GymDashboardEventItemDTO }) {
  const listingBadgeInput = {
    status: event.status,
    registrationStartDate: event.registrationStartDate,
    registrationEndDate: event.registrationEndDate,
  };

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/15 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-base leading-snug">
              {event.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs leading-relaxed">
              주최 {event.organizerName} · 경기구분 {event.divisionCount}개
            </CardDescription>
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            <MatchonStatusBadge
              status={resolveGymListingBadgeMatchonStatus(listingBadgeInput)}
              label={getGymListingBadgeLabel(listingBadgeInput)}
              size="sm"
            />
            <EventStatusPill status={event.status} />
            <RegistrationStatusPill
              status={event.status}
              registrationStartDate={event.registrationStartDate}
              registrationEndDate={event.registrationEndDate}
            />
            {!event.hasPaymentSetting ? (
              <MatchonStatusBadge status="unpaid" label="입금 미설정" size="sm" />
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">대회일</dt>
            <dd className="text-right font-medium">{formatDate(event.eventDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">신청 기간</dt>
            <dd className="text-right text-xs leading-snug">
              {formatRange(
                event.registrationStartDate,
                event.registrationEndDate,
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">대회 상태</dt>
            <dd className="text-right">{event.statusLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">신청</dt>
            <dd className="flex justify-end">
              <MatchonStatusBadge
                status={resolveGymApplyStatusMatchonStatus({
                  canApply: event.canApply,
                  registrationStatusLabel: event.registrationStatusLabel,
                })}
                label={event.registrationStatusLabel}
                size="sm"
              />
            </dd>
          </div>
        </dl>

        {event.liveStreamingEnabled || event.streamingConsentRequired ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
            촬영·스트리밍 안내 및 동의가 필요할 수 있습니다.
          </p>
        ) : null}

        {event.applyDisabledReason && !event.canApply ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {event.applyDisabledReason}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className={cn("border-t bg-muted/10 pt-4", matchonCardStackClass)}>
        {event.canApply ? (
          <Link
            href={`/gym/events/${event.id}/apply`}
            className={cn(buttonVariants({ variant: "default", size: "field" }), "w-full")}
          >
            신청하기
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "secondary", size: "field" }),
              "inline-flex w-full cursor-not-allowed justify-center opacity-80",
            )}
            aria-disabled
          >
            신청 불가
          </span>
        )}
        <Link
          href={`/gym/events/${event.id}/status`}
          className={cn(
            buttonVariants({ variant: "outline", size: "field" }),
            "w-full",
          )}
        >
          신청 현황
        </Link>
        <Link
          href={`/events/${event.publicSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "field" }),
            "w-full",
          )}
        >
          공개 공고 보기
        </Link>
        <Link
          href={`/gym/events/${event.id}/field-status`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "field" }),
            "w-full",
          )}
        >
          현장/계체 상태
        </Link>
      </CardFooter>
    </Card>
  );
}
