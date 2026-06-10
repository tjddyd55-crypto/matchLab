import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { PublicBracketFighterDTO } from "@/lib/dto/public";
import { cn } from "@/lib/utils";

const CORNER_STYLES: Record<
  string,
  { label: string; border: string; bg: string; accent: string }
> = {
  홍코너: {
    label: "홍코너",
    border: "border-red-500/50",
    bg: "bg-red-500/5",
    accent: "text-red-700 dark:text-red-300",
  },
  청코너: {
    label: "청코너",
    border: "border-blue-500/50",
    bg: "bg-blue-500/5",
    accent: "text-blue-700 dark:text-blue-300",
  },
};

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
  const style = CORNER_STYLES[cornerLabel] ?? {
    label: cornerLabel,
    border: "border-border",
    bg: "bg-card",
    accent: "text-muted-foreground",
  };

  if (bye && !fighter) {
    return (
      <div
        className={cn(
          "flex min-h-[6rem] flex-1 flex-col justify-center rounded-xl border border-dashed px-4 py-3",
          style.border,
          style.bg,
          className,
        )}
      >
        <span className={cn("text-xs font-semibold tracking-wide", style.accent)}>
          {style.label}
        </span>
        <span className="text-muted-foreground mt-2 text-sm font-medium">
          BYE · 부전승
        </span>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div
        className={cn(
          "flex min-h-[6rem] flex-1 flex-col justify-center rounded-xl border border-dashed px-4 py-3",
          style.border,
          style.bg,
          className,
        )}
      >
        <span className={cn("text-xs font-semibold tracking-wide", style.accent)}>
          {style.label}
        </span>
        <span className="text-muted-foreground mt-2 text-sm">미배정</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[6rem] flex-1 gap-3 rounded-xl border px-4 py-3 shadow-sm",
        style.border,
        style.bg,
        className,
      )}
    >
      <FighterAvatar
        src={fighter.profileImageUrl}
        name={fighter.name}
        className="size-12 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className={cn("text-xs font-semibold tracking-wide", style.accent)}>
          {style.label}
        </div>
        <div className="truncate text-lg font-bold leading-tight">
          {fighter.name}
        </div>
        <div className="text-muted-foreground truncate text-sm">
          {fighter.gymName ?? "소속 미상"}
        </div>
        <div className="text-muted-foreground text-xs">
          {fighter.recordSummary}
        </div>
      </div>
    </div>
  );
}
