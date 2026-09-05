import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { bracketCardTextTokens } from "@/lib/ui/bracket-card-tokens";
import { getCardClassName } from "@/lib/ui/card-tokens";
import {
  getCornerCardClassName,
  getCornerLabelClassName,
} from "@/lib/ui/corner-ui-tokens";
import { cn } from "@/lib/utils";

export function SpectatorResultCard({ result }: { result: PublicMatchResultDTO }) {
  const formatKind = resolveBoutFormatKind({
    bracketType: result.bracketType,
  });
  const matchLabel =
    result.matchNumber != null
      ? `제${result.matchNumber}경기`
      : "경기";

  const redFighter = result.redFighter ?? result.fighter;
  const blueFighter = result.blueFighter ?? result.opponent;
  const redName = redFighter?.name ?? "—";
  const blueName = blueFighter?.name ?? "—";
  const redWin =
    result.winnerId != null && result.winnerId === redFighter?.fighterId;
  const blueWin =
    result.winnerId != null && result.winnerId === blueFighter?.fighterId;

  return (
    <article className={getCardClassName("spectator")}>
      <div className="border-b bg-muted/20 px-4 py-3">
        <p className={bracketCardTextTokens.matchNumber}>{matchLabel}</p>
        <div
          className={cn(
            bracketCardTextTokens.meta,
            "mt-1 flex flex-wrap gap-x-2 gap-y-1",
          )}
        >
          {result.matNumber != null ? <span>매트 {result.matNumber}</span> : null}
          {result.divisionLabel ? <span>{result.divisionLabel}</span> : null}
          <span>{boutFormatLabel(formatKind)}</span>
          {formatKind === "public_sparring" ? <span>공개스파링</span> : null}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div
          className={cn(
            "rounded-xl border px-3 py-3",
            redWin
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : getCornerCardClassName("홍코너"),
          )}
        >
          <p
            className={cn(
              bracketCardTextTokens.spectatorCornerLabel,
              getCornerLabelClassName("홍코너"),
            )}
          >
            홍코너
          </p>
          <p className={cn("mt-1", bracketCardTextTokens.spectatorFighterName)}>
            {redName}
          </p>
          {redWin ? (
            <p className={cn(bracketCardTextTokens.badge, "text-primary mt-1")}>
              승자
            </p>
          ) : null}
        </div>

        <p className={cn("text-center", bracketCardTextTokens.vs)}>VS</p>

        <div
          className={cn(
            "rounded-xl border px-3 py-3",
            blueWin
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : getCornerCardClassName("청코너"),
          )}
        >
          <p
            className={cn(
              bracketCardTextTokens.spectatorCornerLabel,
              getCornerLabelClassName("청코너"),
            )}
          >
            청코너
          </p>
          <p className={cn("mt-1", bracketCardTextTokens.spectatorFighterName)}>
            {blueName}
          </p>
          {blueWin ? (
            <p className={cn(bracketCardTextTokens.badge, "text-primary mt-1")}>
              승자
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-muted/30 px-3 py-2 text-center">
          {result.resultTypeLabel ? (
            <p className={bracketCardTextTokens.helper}>
              <span className="text-muted-foreground">판정 · </span>
              <span className="font-semibold">{result.resultTypeLabel}</span>
            </p>
          ) : (
            <p className={bracketCardTextTokens.helper}>종료</p>
          )}
        </div>
      </div>
    </article>
  );
}
