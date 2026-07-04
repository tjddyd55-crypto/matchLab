import type { ReactNode } from "react";
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

/** 대진표 후보·경기 편집 슬롯 공용 — 선수명/체육관 중심 compact 표시 */
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
      <div className={cn("min-w-0 space-y-1.5", className)}>
        <p className="text-muted-foreground text-sm leading-tight">
          {emptyLabel}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {fighterName}
          </p>
          <p className="text-muted-foreground truncate text-xs leading-tight">
            {gymName}
          </p>
        </div>
        {statusBadges ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {statusBadges}
          </div>
        ) : null}
      </div>
      {metaLine ? (
        <p className="text-muted-foreground truncate text-xs leading-tight">
          {metaLine}
        </p>
      ) : null}
      {children}
    </div>
  );
}
