import type { EventStatus } from "@/lib/enums";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getOrganizerEventListStatusLabel,
  resolveOrganizerEventListMatchonStatus,
} from "@/lib/ui/event-list-ui";
import { cn } from "@/lib/utils";

export function EventStatusPill({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <MatchonStatusBadge
      status={resolveOrganizerEventListMatchonStatus(status)}
      label={getOrganizerEventListStatusLabel(status)}
      size="sm"
      className={cn("shrink-0", className)}
    />
  );
}
