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
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href="/organizer/events"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#64748B] transition-colors hover:text-[#0A47FF]"
        >
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">대회 목록</span>
        </Link>
        <span className="hidden text-[#CBD5E1] sm:inline" aria-hidden>
          |
        </span>
        <h2 className="truncate font-heading text-base font-bold tracking-tight text-[#0F172A]">
          {eventTitle}
        </h2>
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
