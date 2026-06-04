import Link from "next/link";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
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
import { cn } from "@/lib/utils";

export function PublicEventCardMobile({
  event,
  className,
  priorityImage,
}: PublicEventCardProps) {
  const href = publicEventHref(event.publicSlug);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:hidden",
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
          overlay={
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
              <EventStatusBadges
                eventStatus={event.status}
                registrationStatus={event.registrationStatus}
                emphasizeRegistration={event.registrationStatus === "open"}
              />
            </div>
          }
        />
      </Link>

      <div
        className={cn(
          "flex flex-col gap-3 text-left",
          PUBLIC_EVENT_CARD_BODY_PADDING_CLASS,
        )}
      >
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

        <Link href={href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {publicEventCtaLabel(event)}
        </Link>
      </div>
    </article>
  );
}
