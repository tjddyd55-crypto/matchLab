import type { EventStatus } from "@/lib/enums";
import { ORGANIZER_EVENT_STATUS_LABELS } from "@/lib/event-organizer-status";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const VARIANT: Partial<
  Record<EventStatus, "default" | "secondary" | "outline" | "destructive">
> = {
  open: "outline",
  closed: "secondary",
  bracket_ready: "default",
  ongoing: "default",
  finished: "secondary",
};

export function EventStatusPill({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      variant={VARIANT[status] ?? "secondary"}
      label={ORGANIZER_EVENT_STATUS_LABELS[status]}
      className={cn("shrink-0", className)}
    />
  );
}
