import type { ReactNode } from "react";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { cn } from "@/lib/utils";

/** VS · 대진방식 badge — 중앙 정렬 compact 셀 */
export function BracketMatchCenterCell({
  vsLabel = "VS",
  badges,
  metaLine,
  className,
}: {
  vsLabel?: string;
  badges?: ReactNode;
  metaLine?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-center",
        className,
      )}
    >
      <span
        className={cn(
          bracketCardTypography.vs,
          "leading-none whitespace-nowrap",
        )}
      >
        {vsLabel}
      </span>
      {badges ? (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 [word-break:keep-all]">
          {badges}
        </div>
      ) : null}
      {metaLine ? (
        <span
          className={cn(
            bracketCardTypography.opsPill,
            "text-muted-foreground truncate leading-none whitespace-nowrap",
          )}
          title={metaLine}
        >
          {metaLine}
        </span>
      ) : null}
    </div>
  );
}
