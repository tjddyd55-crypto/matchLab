import type { ReactNode } from "react";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { cn } from "@/lib/utils";

/** VS · 대진방식 badge · 라운드/시간 — 중앙 정렬 compact 셀 */
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
        "flex flex-col items-center justify-center gap-1 px-1 py-1 text-center",
        className,
      )}
    >
      <span className={cn(bracketCardTypography.vs, "leading-none")}>
        {vsLabel}
      </span>
      {badges ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          {badges}
        </div>
      ) : null}
      {metaLine ? (
        <span
          className={cn(
            bracketCardTypography.opsPill,
            "text-muted-foreground leading-none",
          )}
        >
          {metaLine}
        </span>
      ) : null}
    </div>
  );
}
