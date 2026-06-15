import type { PublicBracketMatchDTO } from "@/lib/dto/public";
import type { BracketMatchStatus } from "@/lib/enums";
import { cornerSlotInGridClass } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";

import { FighterSlotCard } from "@/components/domain/brackets/FighterSlotCard";

function statusLabel(s: BracketMatchStatus): string {
  switch (s) {
    case "waiting":
      return "대기";
    case "called":
      return "호출됨";
    case "ongoing":
      return "진행중";
    case "finished":
      return "종료";
    case "delayed":
      return "지연";
    case "cancelled":
      return "취소";
    default:
      return s;
  }
}

export function BracketMatchCard({
  match,
  divisionLabel,
  matPrefix,
  className,
}: {
  match: PublicBracketMatchDTO;
  divisionLabel?: string | null;
  /** 예: "경기 #3" 앞에 붙는 매트 라벨 */
  matPrefix?: string | null;
  className?: string;
}) {
  const blueIsBye =
    Boolean(match.fighterRed) && match.fighterBlue === null;

  const redHighlight =
    match.winnerId &&
    match.fighterRed?.fighterId &&
    match.winnerId === match.fighterRed.fighterId;
  const blueHighlight =
    match.winnerId &&
    match.fighterBlue?.fighterId &&
    match.winnerId === match.fighterBlue.fighterId;

  const matchNoLabel = formatMatchOrderFormal(match);

  return (
    <div
      className={cn(
        "ring-foreground/10 overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">{matchNoLabel}</span>
          {divisionLabel ? (
            <span className="text-muted-foreground">{divisionLabel}</span>
          ) : null}
          {matPrefix != null && match.matNumber != null ? (
            <span className="text-muted-foreground">
              {matPrefix}
              {match.matNumber}
            </span>
          ) : null}
          {match.courtName ? (
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
              {match.courtName}
              {match.courtOrder != null ? ` · ${match.courtOrder}경기` : ""}
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
          {statusLabel(match.status)}
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <FighterSlotCard
          cornerLabel="홍코너"
          fighter={match.fighterRed}
          className={cn(
            cornerSlotInGridClass("홍코너", "border-b md:border-b-0"),
            redHighlight && "ring-2 ring-inset ring-emerald-600/60",
          )}
        />
        <div className="bg-muted/30 text-muted-foreground flex flex-col items-center justify-center px-3 py-2 md:min-w-[3rem] md:py-0">
          <span className="text-lg font-black tracking-widest">VS</span>
        </div>
        <FighterSlotCard
          cornerLabel="청코너"
          fighter={match.fighterBlue}
          bye={blueIsBye}
          className={cn(
            cornerSlotInGridClass("청코너"),
            blueHighlight && "ring-2 ring-inset ring-emerald-600/60",
          )}
        />
      </div>

      {match.resultType ? (
        <p className="text-muted-foreground border-t px-3 py-1.5 text-[11px]">
          결과:{" "}
          <span className="text-foreground font-medium">
            {outcomeStylePublicLabel(match.resultType)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
