import Link from "next/link";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FighterMatchRowDTO } from "@/lib/services/fighter-event-status.service";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
  resolveFighterResultSummaryMatchonStatus,
} from "@/lib/ui/fighter-dashboard-ui";
import {
  matchonBlueCornerPanelClass,
  matchonBlueCornerTextClass,
  matchonRedCornerPanelClass,
  matchonRedCornerTextClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function FighterMatchListCard({ match }: { match: FighterMatchRowDTO }) {
  const resultStatus = resolveFighterResultSummaryMatchonStatus(match.resultSummary);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium leading-snug">{match.eventTitle}</div>
            <div className="text-muted-foreground text-xs">
              {match.divisionLabel} · {match.bracketTitle}
            </div>
          </div>
          <MatchonStatusBadge
            status={resolveBracketMatchMatchonStatus(match.matchStatus)}
            label={getBracketMatchMatchonLabel(match.matchStatus)}
            size="sm"
          />
        </div>

        <div
          className={cn(
            "grid gap-2 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center",
            matchonVsCardClass,
          )}
        >
          <div className={cn("min-w-0", matchonRedCornerPanelClass)}>
            <p className="text-[11px] font-medium opacity-80">나</p>
            <p className={cn("text-sm", matchonRedCornerTextClass)}>내 경기</p>
          </div>
          <span className="text-muted-foreground text-xs font-bold tracking-widest">
            VS
          </span>
          <div className={cn("min-w-0", matchonBlueCornerPanelClass)}>
            <p className="text-[11px] font-medium opacity-80">상대</p>
            <p className={cn("truncate text-sm", matchonBlueCornerTextClass)}>
              {match.opponentName ?? "미정"}
            </p>
            {match.opponentGymName ? (
              <p className="truncate text-xs opacity-80">{match.opponentGymName}</p>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">경기 순서</dt>
            <dd className="tabular-nums">
              {match.matchNumber != null ? `#${match.matchNumber}` : "—"}
              {match.globalMatchOrder != null
                ? ` · 전역 ${match.globalMatchOrder}`
                : ""}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">결과</dt>
            <dd>
              {match.resultSummary && resultStatus ? (
                <MatchonStatusBadge
                  status={resultStatus}
                  label={match.resultSummary}
                  size="sm"
                />
              ) : (
                (match.resultSummary ?? "—")
              )}
            </dd>
          </div>
        </dl>

        <Link
          href={`/events/${match.publicSlug}/brackets`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "field" }),
            "w-full sm:w-auto",
          )}
        >
          공개 대진표 보기
        </Link>
      </CardContent>
    </Card>
  );
}
