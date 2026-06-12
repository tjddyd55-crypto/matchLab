import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { EventShareButtons } from "@/components/domain/events/public/EventShareButtons";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventMapLink } from "@/components/domain/events/public/PublicEventMapLink";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import { buildEventPublicUrl } from "@/lib/share/event-share";

export function EventDetailHeroMobile({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  return (
    <header className="space-y-4 md:hidden">
      <EventPosterImage
        variant="detail"
        src={event.coverImageUrl}
        alt={`${event.title} 포스터`}
        boxClassName="rounded-xl ring-1 ring-foreground/10"
        sizes="(max-width:768px) 100vw, 420px"
        priority
      />

      <div className="flex flex-wrap items-center gap-2">
        <EventStatusBadges
          className="gap-2"
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
          emphasizeRegistration={event.registrationStatus === "open"}
        />
        <PublicEventDeadlineBadge event={event} />
      </div>

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold leading-tight">
          {event.title}
        </h1>
        <p className="text-muted-foreground text-sm">주최 · {event.organizerName}</p>
      </div>

      <EventMetaSummaryMobile
        eventDate={event.eventDate}
        location={event.location}
        registrationStartDate={event.registrationStartDate}
        registrationEndDate={event.registrationEndDate}
        organizerName={event.organizerName}
        showOrganizer
      />

      {event.location ? (
        <PublicEventMapLink
          locationName={event.locationName}
          roadAddress={event.roadAddress}
          location={event.location}
          className="w-fit"
        />
      ) : null}

      {event.paymentInfo ? (
        <p className="text-muted-foreground text-sm">{event.paymentInfo.feeLabel}</p>
      ) : null}

      <PublicEventTrustBadges event={event} compact />

      <div className="w-full space-y-4 [&_a]:flex [&_a]:w-full [&_a]:justify-center">
        <EventApplicationCta
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
          size="lg"
        />
        <EventShareButtons
          url={buildEventPublicUrl(event)}
          layout="stacked"
          className="pt-1"
        />
      </div>
    </header>
  );
}
