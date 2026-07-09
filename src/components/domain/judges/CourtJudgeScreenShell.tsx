"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/lib/utils";
import { resolveDefaultSelectedMatchId } from "@/lib/court-judge-page-state";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { CourtJudgeMatchList } from "./CourtJudgeMatchList";

export function CourtJudgeScreenShell({
  court,
  matches,
  ongoingMatchId,
  roleLabel,
  detail,
  listTitle = "경기 리스트",
  scoreSummariesByMatchId,
  selectable = true,
  selectedMatchId: controlledSelectedMatchId,
  onSelectedMatchIdChange,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  roleLabel: string;
  detail: (match: CourtJudgeMatchVM | null) => React.ReactNode;
  listTitle?: string;
  scoreSummariesByMatchId?: Record<string, CourtMatchScoreSummaryVM>;
  selectable?: boolean;
  selectedMatchId?: string | null;
  onSelectedMatchIdChange?: (matchId: string | null) => void;
}) {
  const defaultSelectedId = useMemo(
    () => resolveDefaultSelectedMatchId(matches, ongoingMatchId),
    [matches, ongoingMatchId],
  );

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(defaultSelectedId);

  const selectedMatchId = controlledSelectedMatchId ?? internalSelectedId;
  const setSelectedMatchId = onSelectedMatchIdChange ?? setInternalSelectedId;

  useEffect(() => {
    if (ongoingMatchId) {
      setSelectedMatchId(ongoingMatchId);
    }
  }, [ongoingMatchId, setSelectedMatchId]);

  useEffect(() => {
    if (selectedMatchId && !matches.some((m) => m.matchId === selectedMatchId)) {
      setSelectedMatchId(defaultSelectedId);
    }
  }, [matches, selectedMatchId, defaultSelectedId, setSelectedMatchId]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.matchId === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  const list = (
    <section aria-label={listTitle} className="space-y-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {listTitle}
      </h2>
      <CourtJudgeMatchList
        matches={matches}
        variant="queue"
        selectedMatchId={selectedMatchId}
        ongoingMatchId={ongoingMatchId}
        selectable={selectable}
        onSelect={selectable ? setSelectedMatchId : undefined}
        scoreSummariesByMatchId={scoreSummariesByMatchId}
      />
    </section>
  );

  const detailPanel = (
    <section aria-label="선택 경기 상세" className="min-w-0 space-y-4">
      {detail(selectedMatch)}
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-5 flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground truncate text-xs">{court.eventTitle}</p>
          <h1 className="truncate text-lg font-bold">
            {court.courtName} · {roleLabel}
          </h1>
        </div>
        <BrandLogo size="sm" showText={false} className="shrink-0" />
      </header>

      {matches.length === 0 ? (
        detail(null)
      ) : (
        <>
          <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(20rem,22rem)_minmax(0,1fr)]">
            {list}
            {detailPanel}
          </div>
          <div className="space-y-5 lg:hidden">
            {detailPanel}
            {list}
          </div>
        </>
      )}
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
