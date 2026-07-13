import Link from "next/link";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import { PUBLIC_EVENT_CARD_BODY_PADDING_CLASS } from "@/components/domain/events/public/public-event-layout";
import {
  publicEventCardClass,
  publicEventCardLivePillClass,
  publicEventCardPosterOverlayClass,
  publicEventCardSportPillClass,
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
  const ctaVariant =
    event.registrationStatus === "open" ? "default" : "outline";

  return (
    <article
      className={cn(publicEventCardClass, "hidden md:flex", className)}
    >
      <Link href={href} className="relative block">
        <EventPosterImage
          variant="card"
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          boxClassName="rounded-none"
          imageClassName="object-cover"
          sizes="(max-width:1024px) 33vw, 340px"
          priority={priorityImage}
          overlay={
            <>
              <div
                className={publicEventCardPosterOverlayClass}
                aria-hidden
              />
              {event.primarySport ? (
                <span className={publicEventCardSportPillClass}>
                  {event.primarySport}
                </span>
              ) : null}
              {event.status === "ongoing" ? (
                <span className={publicEventCardLivePillClass}>
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-white"
                    aria-hidden
                  />
                  LIVE
                </span>
              ) : null}
            </>
          }
        />
      </Link>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2.5 text-left",
          PUBLIC_EVENT_CARD_BODY_PADDING_CLASS,
          "pt-4",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <EventStatusBadges
            className="gap-2"
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
            emphasizeRegistration={event.registrationStatus === "open"}
          />
          <PublicEventDeadlineBadge event={event} compact />
        </div>
        <PublicEventTrustBadges event={event} compact className="mb-1" />

        <Link href={href} className="min-w-0 shrink-0 hover:underline">
          <h3 className="line-clamp-2 font-black text-lg leading-snug text-matchon-text-primary">
            {event.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-matchon-text-secondary">
            {event.organizerName}
          </p>
        </Link>

        <div className="min-h-0 flex-1">
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
        </div>

        {event.liveStreamingEnabled ? (
          <p className="line-clamp-1 shrink-0 text-xs font-semibold text-matchon-primary">
            라이브 스트리밍 예정
          </p>
        ) : null}

        <div className="mt-auto shrink-0 pt-2">
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: ctaVariant, size: "field" }),
              "w-full rounded-xl",
            )}
          >
            {publicEventCtaLabel(event)}
          </Link>
        </div>
      </div>
    </article>
  );
}
