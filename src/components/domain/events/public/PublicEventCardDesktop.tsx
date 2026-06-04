import Link from "next/link";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import {
  publicEventCtaLabel,
  publicEventHref,
  type PublicEventCardProps,
} from "@/components/domain/events/public/public-event-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventCardDesktop({
  event,
  className,
  priorityImage,
}: PublicEventCardProps) {
  const href = publicEventHref(event.publicSlug);

  return (
    <article
      className={cn(
        "group hidden flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-lg md:flex",
        className,
      )}
    >
      <Link href={href} className="relative block">
        <EventPosterImage
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          className="aspect-[4/5] w-full"
          sizes="(max-width:1280px) 25vw, 280px"
          priority={priorityImage}
        />
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          <EventStatusBadges
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
            emphasizeRegistration={event.registrationStatus === "open"}
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href} className="min-w-0 hover:underline">
          <h3 className="font-heading line-clamp-2 text-lg font-semibold leading-snug">
            {event.title}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">{event.organizerName}</p>
        </Link>

        <EventMetaList
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
          organizerName={event.organizerName}
          primarySport={event.primarySport}
          divisionSummary={event.divisionSummary}
          compact
        />

        {event.liveStreamingEnabled ? (
          <p className="text-primary text-xs font-medium">라이브 스트리밍 예정</p>
        ) : null}

        <div className="mt-auto pt-2">
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            {publicEventCtaLabel(event)}
          </Link>
        </div>
      </div>
    </article>
  );
}
