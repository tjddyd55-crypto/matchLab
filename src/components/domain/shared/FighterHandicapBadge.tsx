import type { FighterHandicapDisplay } from "@/lib/fighter-handicap-display";
import { cn } from "@/lib/utils";

export function FighterHandicapBadge({
  handicap,
  className,
  compact = false,
}: {
  handicap: FighterHandicapDisplay | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  if (!handicap?.badgeLabel) return null;

  const isCancelled = handicap.badgeLabel.includes("경기취소");
  const isProceed = handicap.badgeLabel.includes("경기진행");

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex w-fit rounded px-1.5 py-0.5 font-medium",
          compact ? "text-[10px]" : "text-[11px]",
          isCancelled &&
            "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
          isProceed &&
            "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
          !isCancelled &&
            !isProceed &&
            "bg-muted text-muted-foreground",
        )}
      >
        {handicap.badgeLabel}
      </span>
      {handicap.note ? (
        <span
          className={cn(
            "text-amber-800 dark:text-amber-300",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          핸디캡: {handicap.note}
        </span>
      ) : null}
    </div>
  );
}
