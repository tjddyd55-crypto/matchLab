"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CourtJudgeMatchVM } from "@/lib/services/judge-court.service";
import { BracketMatchStatus } from "@/lib/enums";

function statusLabel(status: CourtJudgeMatchVM["status"]): string {
  switch (status) {
    case BracketMatchStatus.waiting:
      return "대기";
    case BracketMatchStatus.ongoing:
      return "진행중";
    case BracketMatchStatus.finished:
      return "경기종료";
    case BracketMatchStatus.cancelled:
      return "경기취소";
    default:
      return String(status);
  }
}

function resultSummary(match: CourtJudgeMatchVM): string | null {
  if (match.status === BracketMatchStatus.finished) {
    const winner = match.winnerName ?? "—";
    const loser = match.loserName ?? "—";
    const style = match.resultTypeLabel ? ` · ${match.resultTypeLabel}` : "";
    return `${winner} 승 / ${loser} 패${style}`;
  }
  if (match.status === BracketMatchStatus.cancelled) {
    return match.resultMemo?.trim() || "취소됨";
  }
  return null;
}

function MatchStatusBadge({ match }: { match: CourtJudgeMatchVM }) {
  if (match.status === BracketMatchStatus.ongoing) {
    return (
      <Badge className="bg-primary text-primary-foreground">
        진행중 · 현재 경기
      </Badge>
    );
  }
  if (match.status === BracketMatchStatus.finished) {
    return <Badge variant="secondary">경기종료</Badge>;
  }
  if (match.status === BracketMatchStatus.cancelled) {
    return <Badge variant="destructive">경기취소</Badge>;
  }
  return <Badge variant="outline">대기</Badge>;
}

function MatchRowContent({
  match,
  compact,
}: {
  match: CourtJudgeMatchVM;
  compact?: boolean;
}) {
  const summary = resultSummary(match);
  const orderLabel =
    match.courtOrder != null ? `${match.courtOrder}경기` : `#${match.matchNumber ?? "?"}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">{orderLabel}</span>
        <MatchStatusBadge match={match} />
      </div>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-base")}>
        <span className={match.winnerId === match.fighterRedId ? "text-emerald-700" : undefined}>
          {match.fighterRedName}
        </span>
        <span className="text-muted-foreground mx-1 font-normal">vs</span>
        <span className={match.winnerId === match.fighterBlueId ? "text-emerald-700" : undefined}>
          {match.fighterBlueName}
        </span>
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {[match.fighterRedGymName, match.fighterBlueGymName]
          .filter(Boolean)
          .join(" · ") || "체육관 미상"}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {match.divisionLabel ?? "경기구분 미상"}
      </p>
      {summary ? (
        <p
          className={cn(
            "mt-2 text-xs",
            match.status === BracketMatchStatus.finished
              ? "text-emerald-800"
              : match.status === BracketMatchStatus.cancelled
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {summary}
        </p>
      ) : null}
    </>
  );
}

export function CourtJudgeMatchList({
  matches,
  selectedMatchId,
  ongoingMatchId,
  onSelect,
  selectable = false,
}: {
  matches: CourtJudgeMatchVM[];
  selectedMatchId?: string | null;
  ongoingMatchId?: string | null;
  onSelect?: (matchId: string) => void;
  selectable?: boolean;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        이 경기장에 배정된 경기가 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map((match) => {
        const isOngoing = match.matchId === ongoingMatchId;
        const isSelected = match.matchId === selectedMatchId;
        const interactive = selectable && onSelect;

        return (
          <li key={match.matchId}>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => onSelect?.(match.matchId)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                isOngoing && "border-primary bg-primary/5 ring-1 ring-primary/30",
                !isOngoing && match.status === BracketMatchStatus.finished &&
                  "border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20",
                !isOngoing && match.status === BracketMatchStatus.cancelled &&
                  "border-destructive/30 bg-destructive/5",
                !isOngoing &&
                  match.status === BracketMatchStatus.waiting &&
                  "border-border bg-card",
                interactive && !isSelected && "hover:bg-muted/40",
                interactive && isSelected && !isOngoing && "ring-1 ring-primary/40",
                !interactive && "cursor-default",
              )}
            >
              <MatchRowContent match={match} compact />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CourtJudgeCurrentMatchCard({
  match,
}: {
  match: CourtJudgeMatchVM;
}) {
  return (
    <section className="rounded-xl border border-primary bg-primary/5 p-4 ring-1 ring-primary/30">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-primary text-xs font-semibold">현재 경기</p>
        <MatchStatusBadge match={match} />
      </div>
      <MatchRowContent match={match} />
    </section>
  );
}

export function CourtJudgeFightersHeader({ match }: { match: CourtJudgeMatchVM }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-lg border">
      <div className="bg-red-500/5 p-3">
        <p className="text-xs font-semibold text-red-700">홍코너</p>
        <p
          className={cn(
            "text-lg font-bold",
            match.winnerId === match.fighterRedId && "text-emerald-700",
          )}
        >
          {match.fighterRedName}
        </p>
        <p className="text-muted-foreground text-xs">{match.fighterRedGymName ?? "—"}</p>
      </div>
      <div className="flex items-center bg-muted/30 px-4 font-black">VS</div>
      <div className="bg-blue-500/5 p-3 text-right">
        <p className="text-xs font-semibold text-blue-700">청코너</p>
        <p
          className={cn(
            "text-lg font-bold",
            match.winnerId === match.fighterBlueId && "text-emerald-700",
          )}
        >
          {match.fighterBlueName}
        </p>
        <p className="text-muted-foreground text-xs">{match.fighterBlueGymName ?? "—"}</p>
      </div>
    </div>
  );
}

export { statusLabel, resultSummary };
