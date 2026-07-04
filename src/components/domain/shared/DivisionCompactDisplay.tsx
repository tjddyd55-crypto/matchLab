import type { ReactNode } from "react";
import {
  type EventDivisionDisplayInput,
  formatDivisionMainLabel,
  formatDivisionSecondaryLabel,
} from "@/lib/event-division-fields";
import { cn } from "@/lib/utils";

/** 경기구분 SSOT — 메인(연령부·성별·체급) + 보조(종목·경기구분) 2줄 표시 */
export function DivisionCompactDisplay({
  division,
  className,
  mainClassName,
  secondaryClassName,
  trailing,
}: {
  division: EventDivisionDisplayInput;
  className?: string;
  mainClassName?: string;
  secondaryClassName?: string;
  trailing?: ReactNode;
}) {
  const main = formatDivisionMainLabel(division);
  const secondary = formatDivisionSecondaryLabel(division);

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <div className="flex flex-wrap items-center gap-1">
        <p className={cn("font-medium leading-snug", mainClassName)}>{main}</p>
        {trailing}
      </div>
      {secondary ? (
        <p className={cn("text-muted-foreground text-xs", secondaryClassName)}>
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
