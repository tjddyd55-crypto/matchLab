import Link from "next/link";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import {
  PUBLIC_EVENT_CARD_BODY_PADDING_CLASS,
  PUBLIC_EVENT_CARD_POSTER_PADDING_CLASS,
} from "@/components/domain/events/public/public-event-layout";
import {
  publicEventCtaLabel,
  publicEventHref,
  type PublicEventCardProps,
} from "@/components/domain/events/public/public-event-ui";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PublicEventCardMobile({
  event,
  className,
  priorityImage,
}: PublicEventCardProps) {
  const href = publicEventHref(event.publicSlug);
  const ctaVariant =
    event.registrationStatus === "open" ? "default" : "outline";

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 md:hidden",
        className,
      )}
    >
      <Link
        href={href}
        className={cn("block", PUBLIC_EVENT_CARD_POSTER_PADDING_CLASS)}
      >
        <EventPosterImage
          variant="card"
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          sizes="100vw"
          priority={priorityImage}
        />
      </Link>

      <CardContent
        className={cn(
          "flex flex-col gap-3 text-left",
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

        <Link href={href} className="min-w-0">
          <h3 className="font-heading line-clamp-2 text-base font-semibold leading-snug">
            {event.title}
          </h3>
        </Link>

        <EventMetaSummaryMobile
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
        />

        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: ctaVariant, size: "field" }),
            "w-full",
          )}
        >
          {publicEventCtaLabel(event)}
        </Link>
      </CardContent>
    </Card>
  );
}
