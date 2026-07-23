import { EventAnnouncementCard } from "@/components/domain/events/announcement/EventAnnouncementCard";
import {
  GymEventApplicationSummary,
  GymEventCardActions,
} from "@/components/domain/events/announcement/GymEventCardActions";
import { eventAnnouncementPublicHref } from "@/components/domain/events/announcement/event-announcement-card-ui";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import type { GymDashboardEventItemDTO } from "@/lib/services/event.service";

export function GymEventCard({ event }: { event: GymDashboardEventItemDTO }) {
  const publicHref = eventAnnouncementPublicHref(event.publicSlug);

  return (
    <EventAnnouncementCard
      event={{
        title: event.title,
        organizerName: event.organizerName,
        coverImageUrl: event.coverImageUrl,
        primarySport: event.primarySport,
        status: event.status,
        registrationStatus: event.registrationStatus,
        registrationDeadlineLabel: event.registrationDeadlineLabel,
        registrationDeadlinePhase: event.registrationDeadlinePhase,
        hasPublicBrackets: event.hasPublicBrackets,
        hasPublicResults: event.hasPublicResults,
      }}
      posterHref={publicHref}
      titleHref={publicHref}
      posterSizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 340px"
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
        />
      }
      extraSummary={<GymEventApplicationSummary event={event} />}
      actions={<GymEventCardActions event={event} />}
    />
  );
}
