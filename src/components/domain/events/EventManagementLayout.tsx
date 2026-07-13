import type { ReactNode } from "react";
import { Suspense } from "react";
import { EventManagementNavigationSheet } from "@/components/domain/events/EventManagementNavigationSheet";
import { EventManagementSideNav } from "@/components/domain/events/EventManagementSideNav";
import type { EventStatus } from "@/lib/enums";
import { EVENT_MANAGEMENT_CONTENT_CLASS } from "@/lib/event-management-layout";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  eventManagementLayoutBleedClass,
  eventManagementLayoutGridClass,
  eventManagementMainColumnClass,
  eventManagementMainContentClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function EventManagementLayout({
  eventId,
  publicSlug,
  eventTitle,
  eventStatus,
  registrationStatus,
  children,
  className,
}: {
  eventId: string;
  publicSlug?: string | null;
  eventTitle: string;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  children: ReactNode;
  className?: string;
}) {
  const navProps = {
    eventId,
    publicSlug,
    eventTitle,
    eventStatus,
    registrationStatus,
  };

  return (
    <div className={cn("w-full min-w-0", eventManagementLayoutBleedClass, className)}>
      <div className={eventManagementLayoutGridClass}>
        <Suspense fallback={null}>
          <EventManagementSideNav {...navProps} />
        </Suspense>

        <div className={eventManagementMainColumnClass}>
          <Suspense fallback={null}>
            <EventManagementNavigationSheet {...navProps} />
          </Suspense>
          <div className={eventManagementMainContentClass}>
            <div className={EVENT_MANAGEMENT_CONTENT_CLASS}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
