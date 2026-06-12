import type { PublicBracketFighterDTO } from "@/lib/dto/public";
import {
  CORNER_SLOT_STYLES,
  type CornerLabel,
} from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";

export function FighterSlotCard({
  cornerLabel,
  fighter,
  bye,
  className,
}: {
  cornerLabel: string;
  fighter: PublicBracketFighterDTO | null;
  bye?: boolean;
  className?: string;
}) {
  const style =
    CORNER_SLOT_STYLES[cornerLabel as CornerLabel] ?? {
      label: cornerLabel as CornerLabel,
      bg: "bg-card",
      accent: "text-muted-foreground",
    };

  const baseClass = cn(
    "flex flex-1 flex-col justify-center gap-0.5 px-3 py-2",
    style.bg,
    className,
  );

  if (bye && !fighter) {
    return (
      <div className={cn(baseClass, "min-h-[3.5rem]")}>
        <span className={cn("text-[11px] font-semibold", style.accent)}>
          {style.label}
        </span>
        <span className="text-muted-foreground text-sm font-medium">
          BYE · 부전승
        </span>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div className={cn(baseClass, "min-h-[3.5rem]")}>
        <span className={cn("text-[11px] font-semibold", style.accent)}>
          {style.label}
        </span>
        <span className="text-muted-foreground text-sm">미배정</span>
      </div>
    );
  }

  return (
    <div className={cn(baseClass, "min-h-[3.5rem]")}>
      <span className={cn("text-[11px] font-semibold", style.accent)}>
        {style.label}
      </span>
      <div className="truncate text-base font-bold leading-tight">
        {fighter.name}
      </div>
      <div className="text-muted-foreground truncate text-xs">
        {fighter.gymName ?? "소속 미상"}
      </div>
      {fighter.divisionName ? (
        <div className="text-muted-foreground truncate text-[11px]">
          {fighter.divisionName}
        </div>
      ) : null}
      {fighter.recordSummary ? (
        <div className="text-muted-foreground text-[11px]">
          {fighter.recordSummary}
        </div>
      ) : null}
    </div>
  );
}
