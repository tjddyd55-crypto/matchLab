import {
  resolvePublicBracketVisibility,
  resolvePublicResultsVisibility,
} from "@/lib/event-public-display";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  getPublicBracketVisibilityLabel,
  getPublicResultsVisibilityLabel,
  resolvePublicBracketVisibilityMatchonStatus,
  resolvePublicResultsVisibilityMatchonStatus,
} from "@/lib/ui/public-spectator-ui";
import { cn } from "@/lib/utils";

export function PublicEventTrustBadges({
  event,
  className,
  compact,
}: {
  event: Pick<
    PublicEventListItemDTO,
    "status" | "hasPublicBrackets" | "hasPublicResults"
  >;
  className?: string;
  compact?: boolean;
}) {
  const bracketVisibility = resolvePublicBracketVisibility(event.hasPublicBrackets);
  const resultsVisibility = resolvePublicResultsVisibility({
    hasPublicResults: event.hasPublicResults,
    status: event.status,
    hasPublicBrackets: event.hasPublicBrackets,
  });

  const size = compact ? "sm" : "md";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <MatchonStatusBadge
        status={resolvePublicBracketVisibilityMatchonStatus(bracketVisibility)}
        label={getPublicBracketVisibilityLabel(bracketVisibility)}
        size={size}
      />
      <MatchonStatusBadge
        status={resolvePublicResultsVisibilityMatchonStatus(resultsVisibility)}
        label={getPublicResultsVisibilityLabel(resultsVisibility)}
        size={size}
      />
    </div>
  );
}
