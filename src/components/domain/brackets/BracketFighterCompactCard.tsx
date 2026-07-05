import type { ReactNode } from "react";
import { BracketFighterInlineIdentity } from "@/components/domain/brackets/BracketFighterInlineIdentity";
import { cn } from "@/lib/utils";

export type BracketFighterCompactBadgeVariant =
  | "default"
  | "warning"
  | "destructive";

export function BracketFighterCompactBadge({
  label,
  variant = "default",
  title,
}: {
  label: string;
  variant?: BracketFighterCompactBadgeVariant;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        variant === "default" && "bg-primary/10 text-primary",
        variant === "warning" &&
          "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        variant === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}

/** 대진표 후보·경기 편집 슬롯 공용 — 체육관 · 선수명 한 줄 compact */
export function BracketFighterCompactCard({
  fighterName,
  gymName,
  statusBadges,
  metaLine,
  empty = false,
  emptyLabel = "선수 미정",
  className,
  children,
}: {
  fighterName?: string;
  gymName?: string;
  statusBadges?: ReactNode;
  metaLine?: string;
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  if (empty) {
    return (
      <div className={cn("min-w-0 space-y-1", className)}>
        <BracketFighterInlineIdentity fallbackText={emptyLabel} />
        {children}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <BracketFighterInlineIdentity
          fighterName={fighterName}
          gymName={gymName}
          className="min-w-0 flex-1"
        />
        {statusBadges ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {statusBadges}
          </div>
        ) : null}
      </div>
      {metaLine ? (
        <p
          className="text-muted-foreground truncate text-[10px] leading-none whitespace-nowrap"
          title={metaLine}
        >
          {metaLine}
        </p>
      ) : null}
      {children}
    </div>
  );
}
