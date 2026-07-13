import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { EventShareButtons } from "@/components/domain/events/public/EventShareButtons";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import { publicEventDivisionSummary } from "@/components/domain/events/public/public-event-ui";
import { buildEventPublicUrl } from "@/lib/share/event-share";
import { matchonStatCardClass } from "@/lib/ui/matchon-shell-ui";

export function EventDetailHeroDesktop({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  return (
    <header className="hidden md:block">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <EventPosterImage
          variant="detail"
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          boxClassName="rounded-[20px] border border-matchon-border shadow-lg"
          imageClassName="object-cover"
          sizes="420px"
          priority
        />

        <div className="flex min-w-0 flex-col gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadges
                className="gap-2"
                eventStatus={event.status}
                registrationStatus={event.registrationStatus}
                emphasizeRegistration={event.registrationStatus === "open"}
              />
              <PublicEventDeadlineBadge event={event} />
            </div>
            <h1 className="font-black text-3xl tracking-tight text-matchon-text-primary lg:text-4xl">
              {event.title}
            </h1>
            <p className="text-sm text-matchon-text-secondary">
              주최 · {event.organizerName}
            </p>
            {event.liveStreamingEnabled ? (
              <p className="text-sm font-semibold text-matchon-primary">
                라이브 스트리밍 예정
              </p>
            ) : null}
          </div>

          <div className={matchonStatCardClass}>
            <div className="space-y-5">
              <EventMetaList
                eventDate={event.eventDate}
                location={event.location}
                registrationStartDate={event.registrationStartDate}
                registrationEndDate={event.registrationEndDate}
                organizerName={event.organizerName}
                primarySport={event.primarySport}
                divisionSummary={publicEventDivisionSummary(event)}
              />
              {event.paymentInfo ? (
                <p className="text-sm text-matchon-text-secondary">
                  {event.paymentInfo.feeLabel}
                </p>
              ) : null}
              <PublicEventTrustBadges event={event} compact />
              <div className="space-y-4 border-t border-matchon-border pt-5">
                <EventApplicationCta
                  eventStatus={event.status}
                  registrationStatus={event.registrationStatus}
                />
                <EventShareButtons url={buildEventPublicUrl(event)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
