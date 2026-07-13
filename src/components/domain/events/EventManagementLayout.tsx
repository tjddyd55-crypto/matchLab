import type { ReactNode } from "react";
import { Suspense } from "react";
import { EventContextHeader } from "@/components/domain/events/EventContextHeader";
import { EventManagementNavBar } from "@/components/domain/events/EventManagementNavBar";
import type { EventStatus } from "@/lib/enums";
import { EVENT_MANAGEMENT_CONTENT_CLASS } from "@/lib/event-management-layout";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  eventManagementChromeClass,
  eventManagementContentInsetClass,
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
  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className={eventManagementChromeClass}>
        <div className={eventManagementContentInsetClass}>
          <EventContextHeader
            eventTitle={eventTitle}
            eventStatus={eventStatus}
            registrationStatus={registrationStatus}
          />
        </div>
        <Suspense fallback={null}>
          <EventManagementNavBar eventId={eventId} publicSlug={publicSlug} />
        </Suspense>
      </div>
      <div className={EVENT_MANAGEMENT_CONTENT_CLASS}>{children}</div>
    </div>
  );
}
