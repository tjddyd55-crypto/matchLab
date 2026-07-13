import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { eventManagementContextHeaderClass } from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function EventContextHeader({
  eventTitle,
  eventStatus,
  registrationStatus,
  className,
}: {
  eventTitle: string;
  eventStatus: EventStatus;
  registrationStatus: OrganizerRegistrationStatus;
  className?: string;
}) {
  return (
    <header className={cn(eventManagementContextHeaderClass, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Link
          href="/organizer/events"
          className="text-matchon-text-secondary hover:text-matchon-primary mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">대회 목록</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-base font-bold tracking-tight text-matchon-text-primary sm:text-lg">
            {eventTitle}
          </h2>
        </div>
      </div>
      <EventStatusBadges
        eventStatus={eventStatus}
        registrationStatus={registrationStatus}
        className="shrink-0"
        emphasizeRegistration
      />
    </header>
  );
}
