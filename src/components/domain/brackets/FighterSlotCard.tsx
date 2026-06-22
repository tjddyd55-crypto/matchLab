import type { PublicBracketFighterDTO } from "@/lib/dto/public";
import { FighterHandicapBadge } from "@/components/domain/shared/FighterHandicapBadge";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
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
    "flex flex-1 flex-col items-center justify-center gap-1 px-3 py-3 text-center",
    style.bg,
    className,
  );

  const handicap =
    fighter?.handicapBadgeLabel || fighter?.handicapNote
      ? {
          badgeLabel: fighter.handicapBadgeLabel ?? null,
          note: fighter.handicapNote ?? null,
        }
      : null;

  if (bye && !fighter) {
    return (
      <div className={cn(baseClass, "min-h-[3.5rem]")}>
        <span className={cn(bracketCardTypography.fighterCorner, style.accent)}>
          {style.label}
        </span>
        <span className={cn(bracketCardTypography.fighterName, "text-muted-foreground font-medium")}>
          BYE · 부전승
        </span>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div className={cn(baseClass, "min-h-[3.5rem]")}>
        <span className={cn(bracketCardTypography.fighterCorner, style.accent)}>
          {style.label}
        </span>
        <span className={cn(bracketCardTypography.fighterName, "text-muted-foreground font-normal")}>
          미배정
        </span>
      </div>
    );
  }

  return (
    <div className={cn(baseClass, "min-h-[3.5rem]")}>
      <span className={cn(bracketCardTypography.fighterCorner, style.accent)}>
        {style.label}
      </span>
      <div className={cn("truncate", bracketCardTypography.fighterName)}>
        {fighter.name}
      </div>
      <div className={cn("truncate", bracketCardTypography.fighterGym)}>
        {fighter.gymName ?? "소속 미상"}
      </div>
      {fighter.recordSummary ? (
        <div className={bracketCardTypography.fighterRecord}>
          {fighter.recordSummary}
        </div>
      ) : null}
      <FighterHandicapBadge
        handicap={handicap}
        cornerLabel={style.label}
        compact
        className="mt-0.5 items-center"
      />
    </div>
  );
}
