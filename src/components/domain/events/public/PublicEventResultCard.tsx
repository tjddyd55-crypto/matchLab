import { FighterAvatar } from "@/components/shared/FighterAvatar";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { formatPublicDateTime } from "@/lib/date-display";
import { cn } from "@/lib/utils";

export function PublicEventResultCard({ result }: { result: PublicMatchResultDTO }) {
  const redFighter = result.redFighter ?? result.fighter;
  const blueFighter = result.blueFighter ?? result.opponent;
  const redWin =
    result.winnerId != null && result.winnerId === redFighter?.fighterId;
  const blueWin =
    result.winnerId != null && result.winnerId === blueFighter?.fighterId;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b bg-muted/30 py-3">
        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
          <span>경기 #{result.matchNumber ?? result.matchId.slice(-6)}</span>
          {result.matNumber != null ? <span>매트 {result.matNumber}</span> : null}
          <span>{formatPublicDateTime(result.matchDate)}</span>
        </div>
        {result.resultTypeLabel ? (
          <MatchonStatusBadge
            status="completed"
            label={result.resultTypeLabel}
            size="sm"
          />
        ) : null}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg p-2",
              redWin && "bg-emerald-50/80 ring-1 ring-emerald-300/60 dark:bg-emerald-950/30",
            )}
          >
            <FighterAvatar
              src={redFighter?.profileImageUrl ?? null}
              name={redFighter?.name ?? "선수"}
            />
            <div className="min-w-0">
              <div className="truncate font-semibold">
                <span className="text-muted-foreground mr-1.5 text-xs font-medium">
                  홍
                </span>
                {redFighter?.name ?? "—"}
                {redWin ? (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 text-xs font-medium">
                    승
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {redFighter?.gymName ?? "소속 미상"} ·{" "}
                {redFighter?.fighterCode ?? ""}
              </div>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center justify-center px-2 text-sm font-bold tracking-wide">
            VS
          </div>

          <div
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg p-2",
              blueWin && "bg-emerald-50/80 ring-1 ring-emerald-300/60 dark:bg-emerald-950/30",
            )}
          >
            <FighterAvatar
              src={blueFighter?.profileImageUrl ?? null}
              name={blueFighter?.name ?? "상대"}
            />
            <div className="min-w-0">
              <div className="truncate font-semibold">
                <span className="text-muted-foreground mr-1.5 text-xs font-medium">
                  청
                </span>
                {blueFighter?.name ?? "—"}
                {blueWin ? (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 text-xs font-medium">
                    승
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {blueFighter?.gymName ?? "소속 미상"} ·{" "}
                {blueFighter?.fighterCode ?? ""}
              </div>
            </div>
          </div>
        </div>

        {result.resultTypeLabel ? (
          <p className="text-muted-foreground mt-3 border-t pt-3 text-center text-xs">
            결방식 {result.resultTypeLabel}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
