"use client";

import { EventManagementSideNavContent } from "@/components/domain/events/EventManagementSideNavContent";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  eventManagementSideNavAsideClass,
  eventManagementSideNavScrollClass,
} from "@/lib/ui/event-management-ui";

export function EventManagementSideNav({
  eventId,
  publicSlug,
  eventTitle,
  eventStatus,
  registrationStatus,
}: {
  eventId: string;
  publicSlug?: string | null;
  eventTitle: string;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
}) {
  return (
    <aside className={eventManagementSideNavAsideClass}>
      <div className={eventManagementSideNavScrollClass}>
        <EventManagementSideNavContent
          eventId={eventId}
          publicSlug={publicSlug}
          eventTitle={eventTitle}
          eventStatus={eventStatus}
          registrationStatus={registrationStatus}
        />
      </div>
    </aside>
  );
}
