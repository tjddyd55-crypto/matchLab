"use client";

import { useEffect, useState } from "react";
import { getJudgeMatchAggregationAction } from "@/features/judges/actions";
import { JudgeMatchAggregationPanel } from "@/components/domain/judges/JudgeMatchAggregationPanel";
import type { JudgeMatchAggregationVM } from "@/lib/judge-score-aggregation";
import type { JudgeScorecardRow } from "@/lib/repositories/judge-scorecard.repository";

type Snapshot = {
  matchId: string;
  aggregation: JudgeMatchAggregationVM | null;
  scorecards: JudgeScorecardRow[];
  error: string | null;
};

export function OrganizerJudgeAggregationInlineSection({
  matchId,
  open,
}: {
  matchId: string;
  open: boolean;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!open || !matchId) return;
    let cancelled = false;
    void getJudgeMatchAggregationAction(matchId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setSnapshot({
          matchId,
          aggregation: null,
          scorecards: [],
          error: res.error.message,
        });
        return;
      }
      setSnapshot({
        matchId,
        aggregation: res.data.aggregation,
        scorecards: res.data.scorecards,
        error: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [matchId, open]);

  if (!open) return null;

  const loading = snapshot === null || snapshot.matchId !== matchId;

  return (
    <section className="border-t pt-4">
      <h3 className="mb-3 text-sm font-semibold">심판 채점 결과</h3>
      {loading ? (
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      ) : snapshot.error ? (
        <p className="text-destructive text-sm">{snapshot.error}</p>
      ) : snapshot.aggregation && snapshot.scorecards.length > 0 ? (
        <JudgeMatchAggregationPanel
          aggregation={snapshot.aggregation}
          scorecards={snapshot.scorecards}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
          채점 제출 없음
        </p>
      )}
    </section>
  );
}
