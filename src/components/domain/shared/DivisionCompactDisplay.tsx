import type { ReactNode } from "react";
import {
  type EventDivisionDisplayInput,
  formatDivisionMainLabel,
  formatDivisionSportTitle,
} from "@/lib/event-division-fields";
import { cn } from "@/lib/utils";

/** 경기구분 SSOT — row 기본은 메인(묶음·성별·체급)만. 종목은 섹션 헤더용. */
export function DivisionCompactDisplay({
  division,
  className,
  mainClassName,
  secondaryClassName,
  trailing,
  showSport = false,
  showSecondary = false,
}: {
  division: EventDivisionDisplayInput;
  className?: string;
  mainClassName?: string;
  secondaryClassName?: string;
  trailing?: ReactNode;
  /** row에서 종목 보조 라인 표시 — 기본 false */
  showSport?: boolean;
  /** showSport 별칭·확장용 — 기본 false */
  showSecondary?: boolean;
}) {
  const main = formatDivisionMainLabel(division);
  const showSportLine = showSport || showSecondary;
  const sportTitle = showSportLine ? formatDivisionSportTitle(division) : null;

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <div className="flex flex-wrap items-center gap-1">
        <p className={cn("font-medium leading-snug", mainClassName)}>{main}</p>
        {trailing}
      </div>
      {showSportLine && sportTitle ? (
        <p className={cn("text-muted-foreground text-xs", secondaryClassName)}>
          {sportTitle}
        </p>
      ) : null}
    </div>
  );
}
