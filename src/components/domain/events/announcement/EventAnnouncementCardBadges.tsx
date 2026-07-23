import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { PublicEventDeadlineBadge } from "@/components/domain/events/public/PublicEventDeadlineBadge";
import { PublicEventTrustBadges } from "@/components/domain/events/public/PublicEventTrustBadges";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import type { PublicEventDeadlinePhase } from "@/lib/event-public-display";
import { cn } from "@/lib/utils";

export type EventAnnouncementBadgeFields = {
  status: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  registrationDeadlineLabel: string;
  registrationDeadlinePhase: PublicEventDeadlinePhase;
  hasPublicBrackets: boolean;
  hasPublicResults: boolean;
};

export function EventAnnouncementCardBadges({
  event,
  className,
  compact = true,
}: {
  event: EventAnnouncementBadgeFields;
  className?: string;
  compact?: boolean;
}) {
  const trustEvent: Pick<
    PublicEventListItemDTO,
    "status" | "hasPublicBrackets" | "hasPublicResults"
  > = {
    status: event.status,
    hasPublicBrackets: event.hasPublicBrackets,
    hasPublicResults: event.hasPublicResults,
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <EventStatusBadges
          className="gap-2"
          eventStatus={event.status}
          registrationStatus={event.registrationStatus}
          emphasizeRegistration={event.registrationStatus === "open"}
        />
        <PublicEventDeadlineBadge
          event={{
            registrationDeadlineLabel: event.registrationDeadlineLabel,
            registrationDeadlinePhase: event.registrationDeadlinePhase,
          }}
          compact={compact}
        />
      </div>
      <PublicEventTrustBadges event={trustEvent} compact={compact} />
    </div>
  );
}
