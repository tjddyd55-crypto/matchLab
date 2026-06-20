import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { MatchRecordOutcome } from "@/lib/enums";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { cn } from "@/lib/utils";

export function SpectatorResultCard({ result }: { result: PublicMatchResultDTO }) {
  const formatKind = resolveBoutFormatKind({
    bracketType: result.bracketType,
  });
  const matchLabel =
    result.matchNumber != null
      ? `제${result.matchNumber}경기`
      : "경기";

  const fighterName = result.fighter?.name ?? "—";
  const opponentName = result.opponent?.name ?? "—";
  const fighterWin = result.result === MatchRecordOutcome.win;
  const opponentWin = result.result === MatchRecordOutcome.loss;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/20 px-4 py-3">
        <p className="text-base font-bold">{matchLabel}</p>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
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
            fighterWin
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : "bg-red-50/60 dark:bg-red-950/20",
          )}
        >
          <p className="text-muted-foreground text-[10px] font-semibold">홍코너</p>
          <p className="mt-1 text-base font-semibold">{fighterName}</p>
          {fighterWin ? (
            <p className="text-primary mt-1 text-xs font-semibold">승자</p>
          ) : null}
        </div>

        <p className="text-center text-sm font-bold text-muted-foreground">VS</p>

        <div
          className={cn(
            "rounded-xl border px-3 py-3",
            opponentWin
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : "bg-blue-50/60 dark:bg-blue-950/20",
          )}
        >
          <p className="text-muted-foreground text-[10px] font-semibold">청코너</p>
          <p className="mt-1 text-base font-semibold">{opponentName}</p>
          {opponentWin ? (
            <p className="text-primary mt-1 text-xs font-semibold">승자</p>
          ) : null}
        </div>

        <div className="rounded-xl bg-muted/30 px-3 py-2 text-center text-sm">
          {result.resultTypeLabel ? (
            <p>
              <span className="text-muted-foreground">판정 · </span>
              <span className="font-semibold">{result.resultTypeLabel}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">종료</p>
          )}
        </div>
      </div>
    </article>
  );
}
