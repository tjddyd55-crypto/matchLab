"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolveJudgeRoleMatchonStatus } from "@/lib/ui/judge-ui";
import { resolveDefaultSelectedMatchId } from "@/lib/court-judge-page-state";
import type {
  CourtJudgeCourtVM,
  CourtJudgeMatchVM,
  CourtMatchScoreSummaryVM,
} from "@/lib/services/judge-court.service";
import { CourtJudgeMatchList } from "./CourtJudgeMatchList";

const LG_BREAKPOINT_PX = 1024;

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
  const detailRef = useRef<HTMLElement>(null);

  const selectedMatchId = controlledSelectedMatchId ?? internalSelectedId;
  const setSelectedMatchId = onSelectedMatchIdChange ?? setInternalSelectedId;

  const handleSelectMatch = useCallback(
    (matchId: string) => {
      setSelectedMatchId(matchId);
      if (typeof window !== "undefined" && window.innerWidth < LG_BREAKPOINT_PX) {
        requestAnimationFrame(() => {
          detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [setSelectedMatchId],
  );

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
    <section
      aria-label={listTitle}
      className="flex min-h-0 flex-col space-y-2 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-1"
    >
      <h2 className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wide uppercase">
        {listTitle}
      </h2>
      <CourtJudgeMatchList
        matches={matches}
        variant="queue"
        selectedMatchId={selectedMatchId}
        ongoingMatchId={ongoingMatchId}
        selectable={selectable}
        onSelect={selectable ? handleSelectMatch : undefined}
        scoreSummariesByMatchId={scoreSummariesByMatchId}
      />
    </section>
  );

  const detailPanel = (
    <section
      ref={detailRef}
      aria-label="선택 경기 상세"
      className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-140px)] lg:self-start lg:overflow-y-auto"
    >
      {detail(selectedMatch)}
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl p-4">
      <Card variant="default" className="mb-5 py-3">
        <CardContent className="flex items-start justify-between gap-3 px-4">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground truncate text-xs">{court.eventTitle}</p>
            <h1 className="truncate text-lg font-bold">{court.courtName}</h1>
            <MatchonStatusBadge
              status={resolveJudgeRoleMatchonStatus(
                roleLabel === "주심판" ? "head" : "score",
              )}
              label={roleLabel}
              size="sm"
            />
          </div>
          <BrandLogo size="sm" showText={false} className="shrink-0" />
        </CardContent>
      </Card>

      {matches.length === 0 ? (
        detail(null)
      ) : (
        <>
          <div className="hidden min-h-0 gap-6 lg:grid lg:grid-cols-[20rem_1fr]">
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
    <Card variant="muted" className={cn("py-4", className)}>
      <CardContent className="px-4">
        <FeedbackMessage tone="info">{children}</FeedbackMessage>
      </CardContent>
    </Card>
  );
}
