"use client";

import { useEffect, useMemo, useRef } from "react";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OperationMatchFighterMatchup } from "@/components/domain/operation/OperationMatchFighterMatchup";
import { OrganizerOperationStatusBadges } from "@/components/domain/operation/OrganizerOperationStatusBadges";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import {
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
    rows[0] ??
    null;

  // onFocusMatch retained for API compatibility; auxiliary highlight cards removed
  void onFocusMatch;

  const showOpsPanel = Boolean(focusedMatch);

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

  const metaParts = [
    focusedMatch.courtName?.trim() || null,
    focusedMatch.divisionLabel?.trim() || null,
  ].filter(Boolean);

  return (
    <section className={cn("space-y-3", className)} aria-label="선택 경기 상세">
      <div className={organizerOperationSpotlightPanelClass}>
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-base font-bold leading-tight text-matchon-text-primary">
                {focusedMatch.orderLabel}
              </p>
              {metaParts.length > 0 || focusedMatch.division ? (
                <div className="text-matchon-text-secondary flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] leading-snug">
                  {focusedMatch.courtName ? (
                    <span>{focusedMatch.courtName}</span>
                  ) : null}
                  {focusedMatch.courtName && focusedMatch.division ? (
                    <span aria-hidden>·</span>
                  ) : null}
                  {focusedMatch.division ? (
                    <DivisionCompactDisplay
                      division={focusedMatch.division}
                      mainClassName="text-[12px] font-medium text-matchon-text-secondary"
                      secondaryClassName="text-[11px]"
                    />
                  ) : focusedMatch.divisionLabel ? (
                    <span className="font-medium">{focusedMatch.divisionLabel}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <OrganizerOperationStatusBadges
              phase={getOperationMatchPhase(focusedMatch)}
              phaseLabel={focusedMatch.phaseLabel}
              resultStatusLabel={focusedMatch.resultStatusLabel}
              status={focusedMatch.status}
              size="sm"
            />
          </div>

          <OperationMatchFighterMatchup
            fighterRed={focusedMatch.fighterRed}
            fighterBlue={focusedMatch.fighterBlue}
            winnerId={focusedMatch.winnerId}
            identityMode="wrap"
            density="compact"
            className="w-full min-w-0"
          />
        </div>

        {showOpsPanel ? (
          <section
            ref={resultRef}
            className="mt-3 border-t border-matchon-border pt-3"
          >
            <h3 className="text-[15px] font-bold text-matchon-text-primary">
              결과 입력
            </h3>
            <div className="mt-2">
              <OrganizerMatchOpsPanel
                {...toMatchOpsProps(focusedMatch)}
                presentation="operation"
                onStatusChanged={onMatchStatusChanged}
              />
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
