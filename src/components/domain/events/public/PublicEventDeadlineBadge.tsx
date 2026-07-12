import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { resolvePublicDeadlinePhaseMatchonStatus } from "@/lib/ui/public-spectator-ui";
import { cn } from "@/lib/utils";

type PublicEventDeadlineBadgeEvent = Pick<
  PublicEventListItemDTO | PublicEventDetailDTO,
  "registrationDeadlineLabel" | "registrationDeadlinePhase"
>;

export function PublicEventDeadlineBadge({
  event,
  className,
  compact,
}: {
  event: PublicEventDeadlineBadgeEvent;
  className?: string;
  compact?: boolean;
}) {
  return (
    <MatchonStatusBadge
      status={resolvePublicDeadlinePhaseMatchonStatus(event.registrationDeadlinePhase)}
      label={event.registrationDeadlineLabel}
      size={compact ? "sm" : "md"}
      className={cn(className)}
    />
  );
}
