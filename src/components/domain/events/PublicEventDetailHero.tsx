import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { EventApplicationCta } from "@/components/domain/events/EventApplicationCta";

export function PublicEventDetailHero({ event }: { event: PublicEventDetailDTO }) {
  const divisionSummary =
    event.divisions.length > 0
      ? `${event.divisions.length}개 부문 · ${event.primarySport ?? event.divisions[0]?.sportType ?? ""}`
      : undefined;

  return (
    <header className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[280px] lg:mx-0">
          <EventPosterImage
            src={event.coverImageUrl}
            alt={`${event.title} 포스터`}
            className="aspect-[3/4] w-full rounded-xl ring-1 ring-foreground/10 shadow-md"
            sizes="(max-width:1024px) 280px, 280px"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="space-y-3">
            <EventStatusBadges
              eventStatus={event.status}
              registrationStatus={event.registrationStatus}
              emphasizeRegistration={event.registrationStatus === "open"}
            />
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-4xl">
              {event.title}
            </h1>
            {event.liveStreamingEnabled ? (
              <p className="text-primary text-sm font-medium">라이브 스트리밍 예정</p>
            ) : null}
          </div>

          <EventMetaList
            eventDate={event.eventDate}
            location={event.location}
            registrationStartDate={event.registrationStartDate}
            registrationEndDate={event.registrationEndDate}
            organizerName={event.organizerName}
            primarySport={event.primarySport}
            divisionSummary={divisionSummary}
          />

          <EventApplicationCta
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
          />
        </div>
      </div>
    </header>
  );
}
