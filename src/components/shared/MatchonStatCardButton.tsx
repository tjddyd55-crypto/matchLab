"use client";

import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function MatchonStatCardButton({
  label,
  value,
  hint,
  active,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
      onClick={onClick}
      className={cn(
        matchonStatCardClass,
        "w-full text-left transition-colors",
        onClick &&
          "cursor-pointer hover:border-matchon-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30",
        active && "border-matchon-primary bg-matchon-primary-light/50 ring-1 ring-matchon-primary/20",
        className,
      )}
    >
      <p className={matchonStatLabelClass}>{label}</p>
      <p className={cn(matchonStatValueClass, "mt-1 tabular-nums")}>{value}</p>
      {hint ? (
        <p className={cn(matchonStatLabelClass, "mt-1 text-[11px]")}>{hint}</p>
      ) : null}
    </Tag>
  );
}
