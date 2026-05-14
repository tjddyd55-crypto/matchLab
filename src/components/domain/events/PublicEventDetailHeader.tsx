import Image from "next/image";
import type { PublicEventDetailDTO } from "@/lib/dto/public";
import {
  formatPublicDate,
  formatPublicPeriod,
} from "@/lib/date-display";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";

export function PublicEventDetailHeader({ event }: { event: PublicEventDetailDTO }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusPill status={event.status} />
            {event.liveStreamingEnabled ? (
              <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                라이브 스트리밍
              </span>
            ) : null}
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {event.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            주최 · {event.organizerName}
          </p>
        </div>
        {event.posterUrl ? (
          <div className="relative aspect-[3/4] w-full max-w-[208px] shrink-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Image
              src={event.posterUrl}
              alt=""
              fill
              className="object-cover"
              sizes="208px"
              unoptimized
            />
          </div>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">대회 일정</dt>
          <dd className="font-medium">{formatPublicDate(event.eventDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">장소</dt>
          <dd className="font-medium">{event.location ?? "추후 안내"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">신청 기간</dt>
          <dd className="font-medium">
            {formatPublicPeriod(
              event.registrationStartDate,
              event.registrationEndDate,
            )}
          </dd>
        </div>
      </dl>
    </header>
  );
}
