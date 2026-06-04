import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { EventApplicationStatusBadge } from "@/components/domain/events/EventApplicationStatusBadge";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { cn } from "@/lib/utils";

export function EventStatusBadges({
  eventStatus,
  registrationStatus,
  className,
  emphasizeRegistration,
}: {
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  className?: string;
  emphasizeRegistration?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <EventStatusPill status={eventStatus} />
      <EventApplicationStatusBadge
        status={registrationStatus}
        emphasized={emphasizeRegistration}
      />
    </div>
  );
}
