import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaSummaryMobile } from "@/components/domain/events/public/EventMetaSummaryMobile";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { EventShareButtons } from "@/components/domain/events/public/EventShareButtons";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import {
  publicEventCardLivePillClass,
  publicEventCardPosterOverlayClass,
  publicEventCardSportPillClass,
} from "@/components/domain/events/public/public-event-ui";
import { buildEventPublicUrl } from "@/lib/share/event-share";
import { cn } from "@/lib/utils";

export function EventDetailHeroMobile({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  return (
    <header className="md:hidden">
      <div className="relative -mx-4 overflow-hidden sm:-mx-6">
        <EventPosterImage
          variant="card"
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          className="w-full"
          boxClassName={cn(
            "relative aspect-[16/10] w-full max-w-none overflow-hidden rounded-none",
          )}
          imageClassName="object-cover"
          sizes="100vw"
          priority
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
      </div>

      <div className="space-y-4 pt-4">
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
          <h1 className="font-black text-2xl leading-tight text-matchon-text-primary">
            {event.title}
          </h1>
          <p className="text-sm text-matchon-text-secondary">
            주최 · {event.organizerName}
          </p>
        </div>

        <EventMetaSummaryMobile
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
          organizerName={event.organizerName}
          showOrganizer
        />

        {event.paymentInfo ? (
          <p className="text-sm text-matchon-text-secondary">
            {event.paymentInfo.feeLabel}
          </p>
        ) : null}

        <PublicEventTrustBadges event={event} compact />

        <div className="w-full space-y-4">
          <EventApplicationCta
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
            size="field"
          />
          <EventShareButtons
            url={buildEventPublicUrl(event)}
            layout="stacked"
            className="pt-1"
          />
        </div>
      </div>
    </header>
  );
}
