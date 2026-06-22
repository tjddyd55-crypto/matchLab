import type { PublicBracketMatchDTO } from "@/lib/dto/public";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import { formatMatchOrderFormal } from "@/lib/match-order-display";
import { cn } from "@/lib/utils";
import { PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";
import { BracketMatchStatusBadge } from "@/components/domain/shared/BracketMatchStatusBadge";

export function SpectatorMatchCard({
  match,
  divisionLabel,
  bracketType,
  bracketIsPublic,
}: {
  match: PublicBracketMatchDTO;
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

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b bg-muted/20 px-4 py-3">
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
            {match.courtName ? <span>{match.courtName}</span> : null}
            {match.matNumber != null ? <span>매트 {match.matNumber}</span> : null}
            {divisionLabel ? <span>{divisionLabel}</span> : null}
            <span>{boutFormatLabel(formatKind)}</span>
            {match.roundName ? <span>{match.roundName}</span> : null}
          </div>
        </div>
        <BracketMatchStatusBadge status={match.status} />
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="rounded-xl border bg-red-50/60 px-3 py-3 dark:bg-red-950/20">
          <p className={bracketCardTypography.spectatorCornerLabel}>홍코너</p>
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

        <div className="rounded-xl border bg-blue-50/60 px-3 py-3 dark:bg-blue-950/20">
          <p className={bracketCardTypography.spectatorCornerLabel}>청코너</p>
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
