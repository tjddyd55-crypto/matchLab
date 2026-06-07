import {
  PUBLIC_BRACKET_VISIBILITY_LABELS,
  PUBLIC_RESULTS_VISIBILITY_LABELS,
  resolvePublicBracketVisibility,
  resolvePublicResultsVisibility,
} from "@/lib/event-public-display";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { cn } from "@/lib/utils";

const BRACKET_VARIANT = {
  published: "bg-violet-600/15 text-violet-800 dark:text-violet-300 border-violet-600/30",
  preparing: "bg-muted text-muted-foreground border-border",
} as const;

const RESULTS_VARIANT = {
  published: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
  preparing: "bg-muted text-muted-foreground border-border",
  none: "bg-muted/60 text-muted-foreground border-border",
} as const;

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

  const sizeClass = compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-md border font-medium",
          sizeClass,
          BRACKET_VARIANT[bracketVisibility],
        )}
      >
        {PUBLIC_BRACKET_VISIBILITY_LABELS[bracketVisibility]}
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-md border font-medium",
          sizeClass,
          RESULTS_VARIANT[resultsVisibility],
        )}
      >
        {PUBLIC_RESULTS_VISIBILITY_LABELS[resultsVisibility]}
      </span>
    </div>
  );
}
