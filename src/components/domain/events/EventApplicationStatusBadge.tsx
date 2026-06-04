import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { PUBLIC_REGISTRATION_STATUS_LABELS } from "@/lib/event-public-display";
import { cn } from "@/lib/utils";

const VARIANT: Record<
  OrganizerRegistrationStatus,
  string
> = {
  open: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
  before: "bg-sky-600/15 text-sky-800 dark:text-sky-300 border-sky-600/30",
  closed: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-muted text-muted-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function EventApplicationStatusBadge({
  status,
  className,
  emphasized,
}: {
  status: OrganizerRegistrationStatus;
  className?: string;
  emphasized?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        VARIANT[status],
        emphasized && status === "open" && "ring-2 ring-emerald-500/40",
        className,
      )}
    >
      {PUBLIC_REGISTRATION_STATUS_LABELS[status]}
    </span>
  );
}
