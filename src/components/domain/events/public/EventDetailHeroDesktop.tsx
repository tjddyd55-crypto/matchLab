import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";
import { publicEventDivisionSummary } from "@/components/domain/events/public/public-event-ui";

export function EventDetailHeroDesktop({
  event,
}: {
  event: PublicEventDetailDTO;
}) {
  return (
    <header className="hidden md:block">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
        <div className="w-full max-w-[300px]">
          <EventPosterImage
            src={event.coverImageUrl}
            alt={`${event.title} 포스터`}
            className="aspect-[3/4] w-full rounded-xl ring-1 ring-foreground/10 shadow-lg"
            sizes="300px"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="space-y-4">
            <EventStatusBadges
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
            <div className="mt-5 border-t pt-5">
              <EventApplicationCta
                eventStatus={event.status}
                registrationStatus={event.registrationStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
