import type { PublicBracketMatchDTO } from "@/lib/dto/public";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { cn } from "@/lib/utils";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";
import { MatchDivisionHeader } from "@/components/domain/shared/MatchDivisionHeader";
import { MatchStatusBadge } from "@/components/domain/shared/MatchStatusBadge";
import { getCornerCardClassName, getCornerLabelClassName } from "@/lib/ui/corner-ui-tokens";

export function SpectatorMatchCard({
  match,
  division,
  divisionLabel,
  bracketType,
  bracketIsPublic,
}: {
  match: PublicBracketMatchDTO;
  division?: EventDivisionDisplayInput | null;
  divisionLabel?: string | null;
  bracketType: string;
  bracketIsPublic?: boolean;
}) {
  const formatKind = resolveBoutFormatKind({
    bracketType,
    bracketIsPublic,
    matchIsPublicSparring: match.matchIsPublicSparring,
  });

  const redName = match.fighterRed?.name ?? "—";
  const blueName =
    match.fighterBlue?.name ?? (match.fighterRed && !match.fighterBlue ? "부전승" : "—");

  const trailing = (
    <>
      <span>{boutFormatLabel(formatKind)}</span>
      {match.roundName ? <span>{match.roundName}</span> : null}
    </>
  );

  const meta = (
    <>
      {match.courtName ? <span>{match.courtName}</span> : null}
      {match.matNumber != null ? <span>매트 {match.matNumber}</span> : null}
    </>
  );

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        {division ? (
          <MatchDivisionHeader
            matchNumberLabel={formatMatchOrderFormal(match)}
            division={division}
            compact
            showSportRule={false}
            trailing={trailing}
            meta={meta}
          />
        ) : (
          <div className="min-w-0 space-y-1">
            <p className={bracketCardTypography.matchNumber}>
              {formatMatchOrderFormal(match)}
            </p>
            <div
              className={cn(
                bracketCardTypography.meta,
                "flex flex-wrap gap-x-2 gap-y-1",
              )}
            >
              {meta}
              {divisionLabel ? <span>{divisionLabel}</span> : null}
              {trailing}
            </div>
          </div>
        )}
        <MatchStatusBadge status={match.status} size="md" />
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className={cn("rounded-xl border px-3 py-3", getCornerCardClassName("홍코너"))}>
          <p className={cn(bracketCardTypography.spectatorCornerLabel, getCornerLabelClassName("홍코너"))}>
            홍코너
          </p>
          <p className={cn("mt-1", bracketCardTypography.spectatorFighterName)}>
            {redName}
          </p>
          {match.fighterRed?.gymName ? (
            <p className={cn("mt-0.5", bracketCardTypography.spectatorGym)}>
              {match.fighterRed.gymName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-1 py-1">
          <span className={bracketCardTypography.vsAccent}>VS</span>
          <PublicSparringUnderVsBadge
            bracketType={bracketType}
            bracketIsPublic={formatKind === "public_sparring"}
          />
        </div>

        <div className={cn("rounded-xl border px-3 py-3", getCornerCardClassName("청코너"))}>
          <p className={cn(bracketCardTypography.spectatorCornerLabel, getCornerLabelClassName("청코너"))}>
            청코너
          </p>
          <p className={cn("mt-1", bracketCardTypography.spectatorFighterName)}>
            {blueName}
          </p>
          {match.fighterBlue?.gymName ? (
            <p className={cn("mt-0.5", bracketCardTypography.spectatorGym)}>
              {match.fighterBlue.gymName}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
