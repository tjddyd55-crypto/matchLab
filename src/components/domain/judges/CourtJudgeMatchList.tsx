"use client";

import { PublicSparringUnderVsBadge } from "@/components/domain/shared/BoutFormatBadge";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCornerLabelClassName,
  getCornerSlotBg,
} from "@/lib/ui/corner-ui-tokens";
import { cn } from "@/lib/utils";
import type {
  CourtJudgeMatchVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { BracketMatchStatus } from "@/lib/enums";
import {
  getBracketMatchMatchonLabel,
  resolveBracketMatchMatchonStatus,
} from "@/lib/ui/bracket-match-ui";
import { sanitizeJudgeVisibleMemo } from "@/lib/match-result-memo";
import { CourtJudgeMatchLabels } from "./CourtJudgeMatchLabels";

function winnerCornerLabel(match: CourtJudgeMatchVM): string | null {
  if (match.status !== BracketMatchStatus.finished || !match.winnerId) return null;
  if (match.winnerId === match.fighterRedId) return "레드 승";
  if (match.winnerId === match.fighterBlueId) return "블루 승";
  return null;
}

function judgeVisibleMemo(match: CourtJudgeMatchVM): string | null {
  return (
    sanitizeJudgeVisibleMemo(match.displayResultMemo) ??
    sanitizeJudgeVisibleMemo(match.resultMemo)
  );
}

function resultSummary(match: CourtJudgeMatchVM): string | null {
  if (match.status === BracketMatchStatus.finished) {
    const corner = winnerCornerLabel(match);
    const winner = match.winnerName ?? "—";
    const loser = match.loserName ?? "—";
    const style = match.resultTypeLabel ? ` · ${match.resultTypeLabel}` : "";
    const cornerPart = corner ? `${corner} · ` : "";
    return `${cornerPart}${winner} 승 / ${loser} 패${style}`;
  }
  if (match.status === BracketMatchStatus.cancelled) {
    return judgeVisibleMemo(match) ?? "취소됨";
  }
  return null;
}

function JudgeMatchStatusBadge({
  match,
  size = "md",
}: {
  match: CourtJudgeMatchVM;
  size?: "sm" | "md";
}) {
  return (
    <MatchonStatusBadge
      status={resolveBracketMatchMatchonStatus(match.status)}
      label={getBracketMatchMatchonLabel(match.status)}
      size={size === "sm" ? "sm" : "md"}
    />
  );
}

function MatchRowContent({
  match,
  variant = "default",
  scoreSummary,
}: {
  match: CourtJudgeMatchVM;
  variant?: "default" | "queue" | "current";
  scoreSummary?: CourtMatchScoreSummaryVM | null;
}) {
  const summary = resultSummary(match);
  const visibleMemo = judgeVisibleMemo(match);
  const orderLabel =
    match.courtOrder != null ? `${match.courtOrder}경기` : `#${match.matchNumber ?? "?"}`;
  const isTerminal =
    match.status === BracketMatchStatus.finished ||
    match.status === BracketMatchStatus.cancelled;

  if (variant === "queue") {
    return (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-muted-foreground shrink-0 text-xs font-medium">{orderLabel}</span>
          <JudgeMatchStatusBadge match={match} size="sm" />
          <p className="min-w-0 truncate text-sm font-medium">
            {match.fighterRedName}
            <span className="text-muted-foreground mx-1 font-normal">vs</span>
            {match.fighterBlueName}
          </p>
        </div>
        <CourtJudgeMatchLabels match={match} compact className="mt-1" />
        {summary && isTerminal ? (
          <p className="text-muted-foreground mt-1 truncate text-[11px]">{summary}</p>
        ) : null}
        {scoreSummary ? (
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{scoreSummary.label}</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">{orderLabel}</span>
        <JudgeMatchStatusBadge match={match} />
      </div>
      <p className={cn("mt-1 font-semibold", variant === "current" ? "text-base" : "text-sm")}>
        <span className={match.winnerId === match.fighterRedId ? "text-emerald-700" : undefined}>
          {match.fighterRedName}
        </span>
        <span className="text-muted-foreground mx-1 font-normal">vs</span>
        <span className={match.winnerId === match.fighterBlueId ? "text-emerald-700" : undefined}>
          {match.fighterBlueName}
        </span>
      </p>
      {variant === "current" ? (
        <PublicSparringUnderVsBadge
          bracketType={match.bracketType}
          bracketIsPublic={match.bracketIsPublic}
          matchIsPublicSparring={match.matchIsPublicSparring}
        />
      ) : null}
      <p className="text-muted-foreground mt-1 text-xs">
        {[match.fighterRedGymName, match.fighterBlueGymName]
          .filter(Boolean)
          .join(" · ") || "체육관 미상"}
      </p>
      <CourtJudgeMatchLabels match={match} compact />
      {visibleMemo && !isTerminal ? (
        <p className="text-muted-foreground mt-1 text-xs">메모: {visibleMemo}</p>
      ) : null}
      {summary ? (
        <p className="text-muted-foreground mt-2 text-xs">{summary}</p>
      ) : null}
      {scoreSummary ? (
        <p className="text-muted-foreground mt-1 text-xs">{scoreSummary.label}</p>
      ) : null}
    </>
  );
}

function queueRowClassName(match: CourtJudgeMatchVM, opts: {
  isOngoing: boolean;
  isSelected: boolean;
  interactive: boolean;
}) {
  const { isOngoing, isSelected, interactive } = opts;
  const isFinished = match.status === BracketMatchStatus.finished;
  const isCancelled = match.status === BracketMatchStatus.cancelled;
  const isWaiting = match.status === BracketMatchStatus.waiting;
  const isCalled = match.status === BracketMatchStatus.called;

  return cn(
    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
    isOngoing && "border-primary bg-primary/5",
    !isOngoing && isCalled && "border-primary/35 bg-primary/[0.03]",
    !isOngoing && isWaiting && "border-border bg-card",
    !isOngoing && isFinished && "border-border/60 bg-muted/20 opacity-80",
    !isOngoing && isCancelled && "border-border/60 bg-muted/10 opacity-75",
    isOngoing && "ring-1 ring-primary/30",
    interactive && isSelected && "ring-2 ring-primary/45 border-primary/50",
    interactive && !isSelected && "hover:bg-muted/30",
    !interactive && "cursor-default",
  );
}

export function CourtJudgeMatchList({
  matches,
  selectedMatchId,
  ongoingMatchId,
  onSelect,
  selectable = false,
  scoreSummariesByMatchId,
  variant = "default",
}: {
  matches: CourtJudgeMatchVM[];
  selectedMatchId?: string | null;
  ongoingMatchId?: string | null;
  onSelect?: (matchId: string) => void;
  selectable?: boolean;
  scoreSummariesByMatchId?: Record<string, CourtMatchScoreSummaryVM>;
  variant?: "default" | "queue";
}) {
  if (matches.length === 0) {
    return (
      <Card variant="muted" className="py-4">
        <CardContent className="px-4">
          <FeedbackMessage tone="info">
            이 경기장에 배정된 경기가 없습니다.
          </FeedbackMessage>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className={cn(variant === "queue" ? "space-y-1.5" : "space-y-2")}>
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
              className={
                variant === "queue"
                  ? queueRowClassName(match, { isOngoing, isSelected, interactive: Boolean(interactive) })
                  : cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      isOngoing && "border-primary bg-primary/5 ring-1 ring-primary/30",
                      !isOngoing && match.status === BracketMatchStatus.called &&
                        "border-primary/40 bg-primary/5",
                      !isOngoing && match.status === BracketMatchStatus.finished &&
                        "border-border/60 bg-muted/20 opacity-80",
                      !isOngoing && match.status === BracketMatchStatus.cancelled &&
                        "border-border/60 bg-muted/10 opacity-75",
                      !isOngoing &&
                        match.status === BracketMatchStatus.waiting &&
                        "border-border bg-card",
                      interactive && !isSelected && "hover:bg-muted/40",
                      interactive && isSelected && !isOngoing && "ring-1 ring-primary/40",
                      !interactive && "cursor-default",
                    )
              }
            >
              <MatchRowContent
                match={match}
                variant={variant === "queue" ? "queue" : "default"}
                scoreSummary={scoreSummariesByMatchId?.[match.matchId]}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CourtJudgeCurrentMatchCard({
  match,
  scoreSummary,
}: {
  match: CourtJudgeMatchVM;
  scoreSummary?: CourtMatchScoreSummaryVM | null;
}) {
  return (
    <section className="rounded-xl border border-primary bg-primary/5 p-4 ring-1 ring-primary/25">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-primary text-xs font-semibold">현재 경기</p>
        <JudgeMatchStatusBadge match={match} />
      </div>
      <MatchRowContent match={match} variant="current" scoreSummary={scoreSummary} />
    </section>
  );
}

export function CourtJudgeFightersHeader({ match }: { match: CourtJudgeMatchVM }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-lg border">
      <div className={cn(getCornerSlotBg("홍코너"), "p-3")}>
        <p className={cn("text-xs font-semibold", getCornerLabelClassName("홍코너"))}>레드</p>
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
      <div className="flex flex-col items-center justify-center bg-muted/30 px-4">
        <span className="font-black">VS</span>
        <PublicSparringUnderVsBadge
          bracketType={match.bracketType}
          bracketIsPublic={match.bracketIsPublic}
          matchIsPublicSparring={match.matchIsPublicSparring}
        />
      </div>
      <div className={cn(getCornerSlotBg("청코너"), "p-3 text-right")}>
        <p className={cn("text-xs font-semibold", getCornerLabelClassName("청코너"))}>블루</p>
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

export { getBracketMatchMatchonLabel as statusLabel, resultSummary };
