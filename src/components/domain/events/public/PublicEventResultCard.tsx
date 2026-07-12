import { FighterAvatar } from "@/components/shared/FighterAvatar";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import type { PublicMatchResultDTO } from "@/lib/dto/public";
import { formatPublicDateTime } from "@/lib/date-display";
import { MatchRecordOutcome } from "@/lib/enums";
import { cn } from "@/lib/utils";

function outcomeKo(o: MatchRecordOutcome): string {
  switch (o) {
    case MatchRecordOutcome.win:
      return "승";
    case MatchRecordOutcome.loss:
      return "패";
    case MatchRecordOutcome.draw:
      return "무";
    case MatchRecordOutcome.no_contest:
      return "노콘";
    default:
      return String(o);
  }
}

function outcomeMatchonStatus(o: MatchRecordOutcome): "approved" | "unapproved" | "waiting" | "completed" {
  switch (o) {
    case MatchRecordOutcome.win:
      return "approved";
    case MatchRecordOutcome.loss:
      return "unapproved";
    case MatchRecordOutcome.draw:
      return "waiting";
    case MatchRecordOutcome.no_contest:
      return "completed";
    default:
      return "waiting";
  }
}

export function PublicEventResultCard({ result }: { result: PublicMatchResultDTO }) {
  const fighterWon = result.result === MatchRecordOutcome.win;
  const opponentWon = result.result === MatchRecordOutcome.loss;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b bg-muted/30 py-3">
        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
          <span>경기 #{result.matchNumber ?? result.matchId.slice(-6)}</span>
          {result.matNumber != null ? <span>매트 {result.matNumber}</span> : null}
          <span>{formatPublicDateTime(result.matchDate)}</span>
        </div>
        <MatchonStatusBadge
          status={outcomeMatchonStatus(result.result)}
          label={`기록 ${outcomeKo(result.result)}`}
          size="sm"
        />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg p-2",
              fighterWon && "bg-emerald-50/80 ring-1 ring-emerald-300/60 dark:bg-emerald-950/30",
            )}
          >
            <FighterAvatar
              src={result.fighter?.profileImageUrl ?? null}
              name={result.fighter?.name ?? "선수"}
            />
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {result.fighter?.name ?? "—"}
                {fighterWon ? (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 text-xs font-medium">
                    승
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {result.fighter?.gymName ?? "소속 미상"} ·{" "}
                {result.fighter?.fighterCode ?? ""}
              </div>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center justify-center px-2 text-sm font-bold tracking-wide">
            VS
          </div>

          <div
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg p-2",
              opponentWon && "bg-emerald-50/80 ring-1 ring-emerald-300/60 dark:bg-emerald-950/30",
            )}
          >
            <FighterAvatar
              src={result.opponent?.profileImageUrl ?? null}
              name={result.opponent?.name ?? "상대"}
            />
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {result.opponent?.name ?? "—"}
                {opponentWon ? (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 text-xs font-medium">
                    승
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {result.opponent?.gymName ?? "소속 미상"} ·{" "}
                {result.opponent?.fighterCode ?? ""}
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
