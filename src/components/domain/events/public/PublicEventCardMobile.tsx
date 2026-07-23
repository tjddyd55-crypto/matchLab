import Link from "next/link";
import { EventAnnouncementCard } from "@/components/domain/events/announcement/EventAnnouncementCard";
import { eventAnnouncementPublicHref } from "@/components/domain/events/announcement/event-announcement-card-ui";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
import {
  publicEventCtaLabel,
  type PublicEventCardProps,
} from "@/components/domain/events/public/public-event-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventCardMobile({
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
      visibilityClassName="md:hidden"
      posterHref={href}
      titleHref={href}
      priorityImage={priorityImage}
      posterSizes="100vw"
      titleSize="base"
      showOrganizerUnderTitle={false}
      meta={
        <EventMetaSummaryMobile
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
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
