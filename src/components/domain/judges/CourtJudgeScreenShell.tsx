"use client";

import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/lib/utils";
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
  children,
  queueTitle = "전체 경기",
  scoreSummariesByMatchId,
  queueSelectable = false,
  selectedMatchId,
  onSelectMatch,
}: {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  roleLabel: string;
  children: React.ReactNode;
  queueTitle?: string;
  scoreSummariesByMatchId?: Record<string, CourtMatchScoreSummaryVM>;
  queueSelectable?: boolean;
  selectedMatchId?: string | null;
  onSelectMatch?: (matchId: string) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header className="flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground truncate text-xs">{court.eventTitle}</p>
          <h1 className="truncate text-lg font-bold">
            {court.courtName} · {roleLabel}
          </h1>
        </div>
        <BrandLogo size="sm" showText={false} className="shrink-0" />
      </header>

      <section aria-label="현재 작업" className="space-y-4">
        {children}
      </section>

      {matches.length > 0 ? (
        <section aria-label={queueTitle} className="space-y-2 border-t pt-4">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {queueTitle}
          </h2>
          <CourtJudgeMatchList
            matches={matches}
            variant="queue"
            ongoingMatchId={ongoingMatchId}
            selectedMatchId={selectedMatchId}
            selectable={queueSelectable}
            onSelect={onSelectMatch}
            scoreSummariesByMatchId={scoreSummariesByMatchId}
          />
        </section>
      ) : null}
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
