import Link from "next/link";
import { EventAnnouncementCard } from "@/components/domain/events/announcement/EventAnnouncementCard";
import {
  eventAnnouncementCardPosterSizesDesktop,
  eventAnnouncementPublicHref,
} from "@/components/domain/events/announcement/event-announcement-card-ui";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import {
  publicEventCtaLabel,
  type PublicEventCardProps,
} from "@/components/domain/events/public/public-event-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventCardDesktop({
  event,
  className,
  priorityImage,
}: PublicEventCardProps) {
  const href = eventAnnouncementPublicHref(event.publicSlug);
  const ctaVariant =
    event.registrationStatus === "open" ? "default" : "outline";

  return (
    <EventAnnouncementCard
      event={event}
      className={className}
      visibilityClassName="hidden md:flex"
      posterHref={href}
      titleHref={href}
      priorityImage={priorityImage}
      posterSizes={eventAnnouncementCardPosterSizesDesktop}
      titleSize="lg"
      showOrganizerUnderTitle={false}
      meta={
        <EventMetaList
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
          organizerName={event.organizerName}
          primarySport={event.primarySport}
          divisionSummary={event.divisionSummary}
          compact
          density="summary"
        />
      }
      actions={
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: ctaVariant, size: "field" }),
            "w-full rounded-xl",
          )}
        >
          {publicEventCtaLabel(event)}
        </Link>
      }
    />
  );
}
