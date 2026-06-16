import type { FighterHandicapDisplay } from "@/lib/fighter-handicap-display";
import { cn } from "@/lib/utils";

export function FighterHandicapBadge({
  handicap,
  cornerLabel,
  className,
  compact = false,
}: {
  handicap: FighterHandicapDisplay | null | undefined;
  /** 예: "홍코너", "청코너" — 대진표·운영 보드에서 코너 구분 */
  cornerLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  if (!handicap?.badgeLabel && !handicap?.note) return null;

  const isCancelled = handicap?.badgeLabel?.includes("경기취소") ?? false;
  const isProceed = handicap?.badgeLabel?.includes("경기진행") ?? false;
  const prefix = cornerLabel ? `${cornerLabel} ` : "";

  if (!handicap?.badgeLabel && handicap?.note) {
    return (
      <div
        className={cn(
          "rounded-md border px-2 py-1.5",
          "border-amber-300 bg-amber-50 text-amber-950",
          "dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100",
          compact ? "text-[10px]" : "text-xs",
          className,
        )}
        role="status"
      >
        <p className="font-semibold">{prefix}핸디캡</p>
        <p className="mt-0.5 whitespace-pre-wrap leading-snug">{handicap.note}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        handicap?.note &&
          "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 dark:border-amber-800 dark:bg-amber-950/80",
        className,
      )}
    >
      {handicap?.badgeLabel ? (
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
          {prefix}
          {handicap.badgeLabel}
        </span>
      ) : null}
      {handicap?.note ? (
        <span
          className={cn(
            "font-medium text-amber-900 dark:text-amber-100",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {prefix}핸디캡: {handicap.note}
        </span>
      ) : null}
    </div>
  );
}
