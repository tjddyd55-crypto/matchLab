import type { EventStatus } from "@/lib/enums";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getOrganizerEventRegistrationLabel,
  resolveOrganizerEventRegistrationMatchonStatus,
} from "@/lib/ui/event-list-ui";
import { cn } from "@/lib/utils";

export function RegistrationStatusPill({
  status,
  registrationStartDate,
  registrationEndDate,
  className,
}: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
  className?: string;
}) {
  return (
    <MatchonStatusBadge
      status={resolveOrganizerEventRegistrationMatchonStatus({
        status,
        registrationStartDate,
        registrationEndDate,
      })}
      label={getOrganizerEventRegistrationLabel({
        status,
        registrationStartDate,
        registrationEndDate,
      })}
      size="sm"
      className={cn("shrink-0", className)}
    />
  );
}
