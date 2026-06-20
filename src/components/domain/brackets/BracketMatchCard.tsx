import type { PublicBracketMatchDTO } from "@/lib/dto/public";
import type { BracketMatchStatus } from "@/lib/enums";
import { cornerSlotInGridClass } from "@/lib/corner-slot-styles";
import { cn } from "@/lib/utils";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { resolveBoutFormatKind } from "@/lib/bout-format";

import { FighterSlotCard } from "@/components/domain/brackets/FighterSlotCard";
import { BoutFormatBadge, PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";

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
  bracketType,
  bracketIsPublic,
  resultMemo,
  operationalSettingsLabel,
}: {
  match: PublicBracketMatchDTO;
  divisionLabel?: string | null;
  /** 예: "경기 #3" 앞에 붙는 매트 라벨 */
  matPrefix?: string | null;
  className?: string;
  bracketType?: string;
  bracketIsPublic?: boolean;
  resultMemo?: string | null;
  operationalSettingsLabel?: string | null;
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

  const isPublicSparring =
    match.matchIsPublicSparring ??
    resolveBoutFormatKind({
      bracketType: bracketType ?? "match_list",
      bracketIsPublic,
      resultMemo,
    }) === "public_sparring";

  const formatKind = bracketType
    ? resolveBoutFormatKind({
        bracketType,
        bracketIsPublic: isPublicSparring,
        matchIsPublicSparring: match.matchIsPublicSparring,
        resultMemo,
      })
    : null;

  const matchNoLabel = formatMatchOrderFormal(match);
  const opsLabel = operationalSettingsLabel ?? match.operationalSettingsLabel;

  return (
    <div
      className={cn(
        "ring-foreground/10 overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 text-xs">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{matchNoLabel}</span>
            {divisionLabel ? (
              <span className="text-muted-foreground">{divisionLabel}</span>
            ) : null}
            {bracketType && formatKind && formatKind !== "public_sparring" ? (
              <BoutFormatBadge
                bracketType={bracketType}
                bracketIsPublic={isPublicSparring}
              />
            ) : null}
            {opsLabel ? (
              <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                {opsLabel}
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
            {matPrefix != null && match.matNumber != null ? (
              <span>
                {matPrefix}
                {match.matNumber}
              </span>
            ) : null}
            {match.courtName ? (
              <span>
                {match.courtName}
                {match.courtOrder != null ? ` · ${match.courtOrder}경기` : ""}
              </span>
            ) : null}
            {match.roundName ? <span>{match.roundName}</span> : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
          {statusLabel(match.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <FighterSlotCard
          cornerLabel="홍코너"
          fighter={match.fighterRed}
          className={cn(
            cornerSlotInGridClass("홍코너", "border-b md:border-b-0"),
            redHighlight && "ring-2 ring-inset ring-emerald-600/60",
          )}
        />
        <div className="bg-muted/20 text-muted-foreground flex flex-col items-center justify-center px-4 py-3 md:min-w-[4.5rem] md:py-4">
          <span className="text-lg font-black tracking-widest">VS</span>
          {bracketType ? (
            <PublicSparringUnderVsBadge
              bracketType={bracketType}
              bracketIsPublic={isPublicSparring}
            />
          ) : null}
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
        <p className="text-muted-foreground border-t px-3 py-1.5 text-center text-[11px]">
          결과:{" "}
          <span className="text-foreground font-medium">
            {outcomeStylePublicLabel(match.resultType)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
