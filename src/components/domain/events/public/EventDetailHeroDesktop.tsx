import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { EventShareButtons } from "@/components/domain/events/public/EventShareButtons";
import { publicEventDivisionSummary } from "@/components/domain/events/public/public-event-ui";
import {
  buildEventPublicUrl,
  buildEventShareText,
  buildEventShareTitle,
} from "@/lib/share/event-share";

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
          boxClassName="rounded-xl ring-1 ring-foreground/10 shadow-lg"
          sizes="420px"
          priority
        />

        <div className="flex min-w-0 flex-col gap-6">
          <div className="space-y-4">
            <EventStatusBadges
              className="gap-2"
              eventStatus={event.status}
              registrationStatus={event.registrationStatus}
              emphasizeRegistration={event.registrationStatus === "open"}
            />
            <h1 className="font-heading text-3xl font-semibold tracking-tight lg:text-4xl">
              {event.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              주최 · {event.organizerName}
            </p>
            {event.liveStreamingEnabled ? (
              <p className="text-primary text-sm font-medium">
                라이브 스트리밍 예정
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border bg-muted/20 p-5">
            <EventMetaList
              eventDate={event.eventDate}
              location={event.location}
              registrationStartDate={event.registrationStartDate}
              registrationEndDate={event.registrationEndDate}
              organizerName={event.organizerName}
              primarySport={event.primarySport}
              divisionSummary={publicEventDivisionSummary(event)}
            />
            <div className="mt-5 space-y-4 border-t pt-5">
              <EventApplicationCta
                eventStatus={event.status}
                registrationStatus={event.registrationStatus}
              />
              <EventShareButtons
                title={buildEventShareTitle(event)}
                text={buildEventShareText(event)}
                url={buildEventPublicUrl(event)}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
