import Link from "next/link";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
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
      <Link href={href} className="block">
        <EventPosterImage
          variant="card"
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          sizes="(max-width:768px) 300px, 300px"
          priority={priorityImage}
          overlay={
            <div className="flex flex-wrap gap-1.5 p-3">
              <EventStatusBadges
                eventStatus={event.status}
                registrationStatus={event.registrationStatus}
                emphasizeRegistration={event.registrationStatus === "open"}
              />
            </div>
          }
        />
      </Link>

      <div className="flex flex-col gap-3 p-4">
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
