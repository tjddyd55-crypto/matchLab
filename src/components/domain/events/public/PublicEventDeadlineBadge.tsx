import {
  resolvePublicEventDeadlinePhase,
  type PublicEventDeadlineInput,
} from "@/lib/event-public-display";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getPublicDeadlineLabel,
  resolvePublicDeadlinePhaseMatchonStatus,
} from "@/lib/ui/public-spectator-ui";
import { cn } from "@/lib/utils";

export function PublicEventDeadlineBadge({
  event,
  className,
  compact,
}: {
  event: PublicEventDeadlineInput;
  className?: string;
  compact?: boolean;
}) {
  const label = getPublicDeadlineLabel(event);
  const phase = resolvePublicEventDeadlinePhase(event);

  return (
    <MatchonStatusBadge
      status={resolvePublicDeadlinePhaseMatchonStatus(phase)}
      label={label}
      size={compact ? "sm" : "md"}
      className={cn(className)}
    />
  );
}
