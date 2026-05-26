import type { EventStatus } from "@/lib/enums";
import {
  ORGANIZER_REGISTRATION_STATUS_LABELS,
  resolveOrganizerRegistrationStatus,
} from "@/lib/event-organizer-status";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const VARIANT: Partial<
  Record<
    ReturnType<typeof resolveOrganizerRegistrationStatus>,
    "default" | "secondary" | "outline" | "destructive"
  >
> = {
  open: "outline",
  before: "secondary",
  closed: "secondary",
  unavailable: "secondary",
  unknown: "secondary",
};

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
  const reg = resolveOrganizerRegistrationStatus({
    status,
    registrationStartDate,
    registrationEndDate,
  });

  return (
    <StatusBadge
      variant={VARIANT[reg] ?? "secondary"}
      label={ORGANIZER_REGISTRATION_STATUS_LABELS[reg]}
      className={cn("shrink-0", className)}
    />
  );
}
