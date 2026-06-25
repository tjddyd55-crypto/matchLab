import type { ReactNode } from "react";
import { DivisionInfoChips } from "@/components/domain/shared/DivisionInfoChips";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import {
  type EventDivisionDisplayInput,
  formatDivisionCompactLine,
  formatDivisionSportRuleLabel,
} from "@/lib/event-division-fields";
import { cn } from "@/lib/utils";

export function MatchDivisionHeader({
  matchNumberLabel,
  division,
  compact = false,
  showSportRule,
  showSkill = true,
  trailing,
  meta,
  className,
}: {
  matchNumberLabel: string;
  division?: EventDivisionDisplayInput | null;
  compact?: boolean;
  showSportRule?: boolean;
  showSkill?: boolean;
  trailing?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  const sportRuleVisible = showSportRule ?? !compact;
  const sportRuleLabel = division
    ? formatDivisionSportRuleLabel(division)
    : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          bracketCardTypography.headerRow,
        )}
      >
        <span className={bracketCardTypography.matchNumber}>
          {matchNumberLabel}
        </span>
        {division && compact ? (
          <span className={bracketCardTypography.division}>
            {formatDivisionCompactLine(division)}
          </span>
        ) : division ? (
          <DivisionInfoChips
            division={division}
            compact
            showSportRule={false}
            showSkill={showSkill}
            className="inline-flex min-w-0 flex-1 flex-col gap-0"
          />
        ) : null}
        {trailing}
      </div>
      {division && sportRuleVisible && sportRuleLabel ? (
        <p className={cn(bracketCardTypography.meta, "text-muted-foreground")}>
          {sportRuleLabel}
        </p>
      ) : null}
      {meta ? (
        <div
          className={cn(
            bracketCardTypography.meta,
            "flex flex-wrap items-center gap-2",
          )}
        >
          {meta}
        </div>
      ) : null}
    </div>
  );
}
