"use client";

import { useEffect, useMemo, useRef } from "react";
import { OrganizerMatchOpsPanel } from "@/components/domain/brackets/OrganizerMatchOpsPanel";
import { OperationMatchHighlightCard } from "@/components/domain/operation/OperationMatchHighlightCard";
import { toMatchOpsProps } from "@/components/domain/operation/operation-match-row";
import type { OperationMatchRowVM } from "@/components/domain/operation/operation-match-row";
import {
  canEnterResult,
  canViewResult,
  pickOperationSpotlightMatches,
} from "@/lib/match-operation-display";
import { organizerOperationSpotlightPanelClass } from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

export function OperationSpotlightSection({
  rows,
  focusedMatchId,
  onFocusMatch,
  className,
}: {
  rows: OperationMatchRowVM[];
  focusedMatchId: string | null;
  onFocusMatch: (matchId: string) => void;
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

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="경기 운영 요약"
    >
      <div className="grid gap-3 lg:grid-cols-1">
        <OperationMatchHighlightCard
          title="현재 경기"
          match={spotlight.current}
          variant="selected"
          selected={spotlight.current?.matchId === focusedMatchId}
          onSelect={(m) => onFocusMatch(m.matchId)}
        />
        <OperationMatchHighlightCard
          title="다음 경기"
          match={spotlight.next}
          variant="default"
          selected={spotlight.next?.matchId === focusedMatchId}
          onSelect={(m) => onFocusMatch(m.matchId)}
        />
        <OperationMatchHighlightCard
          title="최근 종료 경기"
          match={spotlight.recentFinished}
          variant="success"
          selected={spotlight.recentFinished?.matchId === focusedMatchId}
          onSelect={(m) => onFocusMatch(m.matchId)}
        />
      </div>

      {showOpsPanel && focusedMatch ? (
        <section ref={resultRef} className={organizerOperationSpotlightPanelClass}>
          <h3 className="text-sm font-bold text-matchon-text-primary">
            {showResultEntry
              ? `결과 입력 · ${focusedMatch.orderLabel}`
              : `경기 운영 · ${focusedMatch.orderLabel}`}
          </h3>
          <div className="mt-3">
            <OrganizerMatchOpsPanel
              {...toMatchOpsProps(focusedMatch)}
              presentation="operation"
            />
          </div>
        </section>
      ) : null}
    </section>
  );
}
