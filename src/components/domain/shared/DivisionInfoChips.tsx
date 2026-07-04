import type { ReactNode } from "react";
import {
  type EventDivisionDisplayInput,
  resolveDivisionDisplayParts,
} from "@/lib/event-division-fields";
import {
  divisionGenderChipClassNames,
  divisionNeutralChipClassName,
  type DivisionGenderTone,
} from "@/lib/ui/division-gender-ui";
import { cn } from "@/lib/utils";

function DivisionChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}

function GenderChip({
  label,
  tone,
}: {
  label: string;
  tone: DivisionGenderTone;
}) {
  return (
    <DivisionChip className={divisionGenderChipClassNames[tone]}>
      {label}
    </DivisionChip>
  );
}

export function DivisionInfoChips({
  division,
  compact = false,
  showSportRule = true,
  showSkill = false,
  className,
  trailing,
}: {
  division: EventDivisionDisplayInput;
  compact?: boolean;
  showSportRule?: boolean;
  showSkill?: boolean;
  className?: string;
  trailing?: ReactNode;
}) {
  const parts = resolveDivisionDisplayParts(division);

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-1">
        {parts.ageGroup ? (
          <DivisionChip className={divisionNeutralChipClassName}>
            {parts.ageGroup}
          </DivisionChip>
        ) : null}
        {parts.genderLabel ? (
          <GenderChip label={parts.genderLabel} tone={parts.genderTone} />
        ) : null}
        {parts.weightChipLabel ? (
          <DivisionChip className={divisionNeutralChipClassName}>
            {parts.weightChipLabel}
          </DivisionChip>
        ) : null}
        {showSkill && parts.skillLevel ? (
          <DivisionChip className={divisionNeutralChipClassName}>
            {parts.skillLevel}
          </DivisionChip>
        ) : null}
        {trailing}
      </div>
      {showSportRule && !compact && parts.sportTitle ? (
        <p className="text-muted-foreground text-xs">{parts.sportTitle}</p>
      ) : null}
    </div>
  );
}
