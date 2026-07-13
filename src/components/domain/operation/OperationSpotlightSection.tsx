"use client";

import { useEffect, useMemo, useRef } from "react";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { OperationMatchHighlightCard } from "@/components/domain/operation/OperationMatchHighlightCard";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import {
  canEnterResult,
  canViewResult,
  getOperationMatchPhase,
  pickOperationSpotlightMatches,
} from "@/lib/match-operation-display";
import { organizerOperationSpotlightPanelClass } from "@/lib/ui/organizer-operation-ui";
import { BracketMatchStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

export function OperationSpotlightSection({
  rows,
  focusedMatchId,
  onFocusMatch,
  onMatchStatusChanged,
  className,
}: {
  rows: OperationMatchRowVM[];
  focusedMatchId: string | null;
  onFocusMatch: (matchId: string) => void;
  onMatchStatusChanged?: (matchId: string, status: BracketMatchStatus) => void;
  className?: string;
}) {
  const resultRef = useRef<HTMLElement>(null);
  const spotlight = useMemo(() => pickOperationSpotlightMatches(rows), [rows]);

  const focusedMatch =
    rows.find((r) => r.matchId === focusedMatchId) ??
    spotlight.current ??
    spotlight.next ??
    null;

  const showOpsPanel = Boolean(focusedMatch);
  const showResultEntry =
    focusedMatch &&
    (canEnterResult(focusedMatch) || canViewResult(focusedMatch));

  useEffect(() => {
    if (!focusedMatchId || typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [focusedMatchId]);

  if (!focusedMatch) {
    return (
      <section
        className={cn(
          organizerOperationSpotlightPanelClass,
          "text-matchon-text-secondary text-sm",
          className,
        )}
        aria-label="선택 경기 상세"
      >
        왼쪽 목록에서 경기를 선택하면 상세 운영 패널이 표시됩니다.
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)} aria-label="선택 경기 상세">
      <div className={organizerOperationSpotlightPanelClass}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-matchon-text-secondary text-xs font-medium">
                현재 경기
              </p>
              <p className="text-base font-bold leading-snug text-matchon-text-primary">
                {focusedMatch.orderLabel}
                {focusedMatch.courtName ? (
                  <span className="text-matchon-text-secondary ml-1 text-sm font-normal">
                    · {focusedMatch.courtName}
                  </span>
                ) : null}
              </p>
            </div>
            <OrganizerOperationStatusBadges
              phase={getOperationMatchPhase(focusedMatch)}
              phaseLabel={focusedMatch.phaseLabel}
              resultStatusLabel={focusedMatch.resultStatusLabel}
              status={focusedMatch.status}
            />
          </div>

          {focusedMatch.division ? (
            <DivisionCompactDisplay
              division={focusedMatch.division}
              mainClassName="text-xs"
              secondaryClassName="text-[11px]"
            />
          ) : (
            <p className="text-xs font-medium">
              {focusedMatch.divisionLabel ?? "경기구분 미상"}
            </p>
          )}

          <OperationMatchFighterMatchup
            fighterRed={focusedMatch.fighterRed}
            fighterBlue={focusedMatch.fighterBlue}
            winnerId={focusedMatch.winnerId}
            identityMode="wrap"
            className="w-full min-w-0"
          />
        </div>

        {showOpsPanel ? (
          <section ref={resultRef} className="mt-4 border-t border-matchon-border pt-4">
            <h3 className="text-sm font-bold text-matchon-text-primary">
              {showResultEntry
                ? `결과 입력 · ${focusedMatch.orderLabel}`
                : `경기 운영 · ${focusedMatch.orderLabel}`}
            </h3>
            <div className="mt-3">
              <OrganizerMatchOpsPanel
                {...toMatchOpsProps(focusedMatch)}
                presentation="operation"
                onStatusChanged={onMatchStatusChanged}
              />
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-matchon-border pt-3">
        <p className="text-matchon-text-secondary text-[11px] font-medium uppercase tracking-wide">
          보조 정보
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <OperationMatchHighlightCard
            title="현재 경기"
            match={spotlight.current}
            variant="selected"
            selected={spotlight.current?.matchId === focusedMatchId}
            onSelect={(m) => onFocusMatch(m.matchId)}
            className="p-3"
          />
          <OperationMatchHighlightCard
            title="다음 경기"
            match={spotlight.next}
            variant="default"
            selected={spotlight.next?.matchId === focusedMatchId}
            onSelect={(m) => onFocusMatch(m.matchId)}
            className="p-3"
          />
          <OperationMatchHighlightCard
            title="최근 종료"
            match={spotlight.recentFinished}
            variant="success"
            selected={spotlight.recentFinished?.matchId === focusedMatchId}
            onSelect={(m) => onFocusMatch(m.matchId)}
            className="p-3"
          />
        </div>
      </div>
    </section>
  );
}
