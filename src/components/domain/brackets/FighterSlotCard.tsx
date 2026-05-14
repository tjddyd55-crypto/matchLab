import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { PublicBracketFighterDTO } from "@/lib/dto/public";
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
  if (bye && !fighter) {
    return (
      <div
        className={cn(
          "bg-muted/40 flex min-h-[4.5rem] flex-1 flex-col justify-center rounded-lg border border-dashed px-3 py-2 text-sm",
          className,
        )}
      >
        <span className="text-muted-foreground text-xs font-medium">
          {cornerLabel}
        </span>
        <span className="text-muted-foreground mt-1 font-medium">BYE · 부전승</span>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex min-h-[4.5rem] flex-1 flex-col justify-center rounded-lg border border-dashed px-3 py-2 text-sm",
          className,
        )}
      >
        <span className="text-muted-foreground text-xs font-medium">
          {cornerLabel}
        </span>
        <span className="text-muted-foreground mt-1">미배정</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-1 gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm",
        className,
      )}
    >
      <FighterAvatar src={fighter.profileImageUrl} name={fighter.name} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {cornerLabel}
        </div>
        <div className="truncate font-semibold">{fighter.name}</div>
        <div className="text-muted-foreground truncate text-xs">
          {fighter.gymName ?? "소속 미상"} · {fighter.fighterCode}
        </div>
        <div className="text-muted-foreground text-xs">
          {fighter.recordSummary}
          {fighter.divisionName ? ` · ${fighter.divisionName}` : ""}
        </div>
      </div>
    </div>
  );
}
