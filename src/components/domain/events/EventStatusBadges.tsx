import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getPublicEventStatusLabel,
  getPublicRegistrationStatusLabel,
  resolvePublicEventStatusMatchonStatus,
  resolvePublicRegistrationMatchonStatus,
} from "@/lib/ui/public-spectator-ui";
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
      <MatchonStatusBadge
        status={resolvePublicEventStatusMatchonStatus(eventStatus)}
        label={getPublicEventStatusLabel(eventStatus)}
        size="sm"
      />
      <MatchonStatusBadge
        status={resolvePublicRegistrationMatchonStatus(registrationStatus)}
        label={getPublicRegistrationStatusLabel(registrationStatus)}
        size="sm"
        className={cn(
          emphasizeRegistration &&
            registrationStatus === "open" &&
            "ring-2 ring-emerald-500/40",
        )}
      />
    </div>
  );
}
