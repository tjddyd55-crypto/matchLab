import type { PublicBracketMatchDTO } from "@/lib/dto/public";
import type { BracketMatchStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";
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
  matPrefix,
  className,
}: {
  match: PublicBracketMatchDTO;
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

  return (
    <div
      className={cn(
        "ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-muted-foreground flex flex-wrap gap-2">
          {match.roundName ? (
            <span className="font-medium">{match.roundName}</span>
          ) : null}
          {match.matchNumber != null ? (
            <span>경기 #{match.matchNumber}</span>
          ) : (
            <span>순번 {match.matchOrder + 1}</span>
          )}
          {matPrefix != null && match.matNumber != null ? (
            <span>
              {matPrefix}
              {match.matNumber}
            </span>
          ) : null}
          {match.globalMatchOrder != null ? (
            <span>전체순서 {match.globalMatchOrder}</span>
          ) : null}
        </div>
        <span className="bg-muted rounded px-2 py-0.5 font-medium">
          {statusLabel(match.status)}
        </span>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        <FighterSlotCard
          cornerLabel="레드"
          fighter={match.fighterRed}
          className={cn(
            redHighlight && "ring-emerald-600/70 ring-2 ring-offset-2",
          )}
        />
        <div className="text-muted-foreground hidden shrink-0 items-center px-1 text-xs font-semibold md:flex">
          VS
        </div>
        <FighterSlotCard
          cornerLabel="블루"
          fighter={match.fighterBlue}
          bye={blueIsBye}
          className={cn(
            blueHighlight && "ring-emerald-600/70 ring-2 ring-offset-2",
          )}
        />
      </div>
      <p className="text-muted-foreground text-[11px]">
        {match.resultType ? (
          <>
            공식 결방식:{" "}
            <span className="text-foreground font-medium">
              {outcomeStylePublicLabel(match.resultType)}
            </span>
          </>
        ) : (
          <>브래킷에 확정된 결방식 정보가 없습니다.</>
        )}
      </p>
    </div>
  );
}
