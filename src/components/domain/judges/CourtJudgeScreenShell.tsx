"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/lib/utils";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import {
  CourtJudgeCurrentMatchCard,
  CourtJudgeMatchList,
} from "./CourtJudgeMatchList";

export function CourtJudgeScreenShell({
  court,
  matches,
  ongoingMatchId,
  roleLabel,
  detail,
  mobileDetailFirst = false,
  selectable = true,
  selectedMatchId: controlledSelectedMatchId,
  onSelectedMatchIdChange,
  scoreSummariesByMatchId,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  roleLabel: string;
  detail: (match: CourtJudgeMatchVM | null) => React.ReactNode;
  mobileDetailFirst?: boolean;
  selectable?: boolean;
  selectedMatchId?: string | null;
  onSelectedMatchIdChange?: (matchId: string) => void;
  scoreSummariesByMatchId?: Record<string, CourtMatchScoreSummaryVM>;
}) {
  const defaultSelectedId =
    ongoingMatchId ??
    matches.find((m) => m.status === "waiting")?.matchId ??
    matches[0]?.matchId ??
    null;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    defaultSelectedId,
  );

  const selectedMatchId = controlledSelectedMatchId ?? internalSelectedId;
  const setSelectedMatchId = onSelectedMatchIdChange ?? setInternalSelectedId;

  const selectedMatch = useMemo(
    () => matches.find((m) => m.matchId === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  const ongoingMatch = useMemo(
    () => matches.find((m) => m.matchId === ongoingMatchId) ?? null,
    [matches, ongoingMatchId],
  );

  const list = (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">경기 리스트</h2>
      <CourtJudgeMatchList
        matches={matches}
        selectedMatchId={selectedMatchId}
        ongoingMatchId={ongoingMatchId}
        selectable={selectable}
        onSelect={selectable ? setSelectedMatchId : undefined}
        scoreSummariesByMatchId={scoreSummariesByMatchId}
      />
    </section>
  );

  const detailPanel = (
    <section className="space-y-4">
      <header className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground text-xs">{court.eventTitle}</p>
        <h1 className="mt-1 text-xl font-bold">
          {court.courtName} {roleLabel}
        </h1>
      </header>
      {detail(selectedMatch)}
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex justify-center md:justify-start">
        <BrandLogo size="sm" showText />
      </div>
      <header className="mb-4 rounded-xl border bg-card p-4 lg:hidden">
        <p className="text-muted-foreground text-xs">{court.eventTitle}</p>
        <h1 className="mt-1 text-xl font-bold">
          {court.courtName} {roleLabel}
        </h1>
      </header>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        {list}
        {detailPanel}
      </div>

      <div className="space-y-4 lg:hidden">
        {mobileDetailFirst && ongoingMatch ? (
          <>
            <CourtJudgeCurrentMatchCard
              match={ongoingMatch}
              scoreSummary={scoreSummariesByMatchId?.[ongoingMatch.matchId]}
            />
            {detail(selectedMatch)}
            {list}
          </>
        ) : (
          <>
            {ongoingMatch ? (
              <CourtJudgeCurrentMatchCard
                match={ongoingMatch}
                scoreSummary={scoreSummariesByMatchId?.[ongoingMatch.matchId]}
              />
            ) : null}
            {detailPanel}
            {list}
          </>
        )}
      </div>
    </div>
  );
}

export function CourtJudgeEmptyNotice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
