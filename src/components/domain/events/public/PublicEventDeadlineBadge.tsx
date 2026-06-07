import {
  resolvePublicEventDeadlineLabel,
  resolvePublicEventDeadlinePhase,
  type PublicEventDeadlineInput,
} from "@/lib/event-public-display";
import { cn } from "@/lib/utils";

const PHASE_VARIANT: Record<
  ReturnType<typeof resolvePublicEventDeadlinePhase>,
  string
> = {
  event_finished: "bg-muted text-muted-foreground border-border",
  registration_before: "bg-sky-600/15 text-sky-800 dark:text-sky-300 border-sky-600/30",
  registration_open: "bg-amber-600/15 text-amber-900 dark:text-amber-200 border-amber-600/40",
  registration_closed: "bg-muted text-muted-foreground border-border",
};

export function PublicEventDeadlineBadge({
  event,
  className,
  compact,
}: {
  event: PublicEventDeadlineInput;
  className?: string;
  compact?: boolean;
}) {
  const label = resolvePublicEventDeadlineLabel(event);
  const phase = resolvePublicEventDeadlinePhase(event);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        PHASE_VARIANT[phase],
        className,
      )}
    >
      {label}
    </span>
  );
}
