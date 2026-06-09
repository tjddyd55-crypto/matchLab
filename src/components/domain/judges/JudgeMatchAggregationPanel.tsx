"use client";

import type { JudgeMatchAggregationVM } from "@/lib/judge-score-aggregation";
import type { JudgeScorecardRow } from "@/lib/repositories/judge-scorecard.repository";

const CORNER_LABEL: Record<string, string> = {
  red: "홍",
  blue: "청",
  draw: "무",
  no_contest: "NC",
  undecided: "—",
};

export function JudgeMatchAggregationPanel({
  aggregation,
  scorecards,
}: {
  aggregation: JudgeMatchAggregationVM;
  scorecards?: JudgeScorecardRow[];
}) {
  if (aggregation.assignedCount === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        배정된 심판이 없습니다. 심판 관리에서 계정을 만들고 경기에 배정하세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
        심판 채점은 참고용입니다. 최종 결과 확정은 결과 입력에서 진행하세요.
      </p>

      <div className="flex flex-wrap gap-4">
        <p>
          제출:{" "}
          <strong>
            {aggregation.submittedCount}/{aggregation.assignedCount}
          </strong>
        </p>
        {aggregation.pendingJudgeNames.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            미제출: {aggregation.pendingJudgeNames.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-2 font-medium">심판</th>
              <th className="px-2 py-2 font-medium">홍</th>
              <th className="px-2 py-2 font-medium">청</th>
              <th className="px-2 py-2 font-medium">승자</th>
              <th className="px-2 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {aggregation.scorecards.map((s) => (
              <tr key={s.judgeName} className="border-t">
                <td className="px-2 py-2">{s.judgeName}</td>
                <td className="px-2 py-2">{s.redTotal ?? "—"}</td>
                <td className="px-2 py-2">{s.blueTotal ?? "—"}</td>
                <td className="px-2 py-2">
                  {CORNER_LABEL[s.winnerCorner] ?? s.winnerCorner}
                </td>
                <td className="px-2 py-2">
                  {s.submitted ? "제출" : "미제출"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scorecards && scorecards.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">
            라운드별 점수표
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {scorecards.map((card) => (
              <div key={card.id} className="rounded border p-2">
                <p className="font-medium">{card.judgeName}</p>
                <table className="mt-1 w-full">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 text-left">R</th>
                      <th className="py-1">홍</th>
                      <th className="py-1">청</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.rounds.map((r) => (
                      <tr key={r.roundNumber}>
                        <td className="py-0.5">{r.roundNumber}</td>
                        <td className="py-0.5 text-center">
                          {r.redScore ?? "—"}
                          {r.redDeductions > 0 ? ` (-${r.redDeductions})` : ""}
                        </td>
                        <td className="py-0.5 text-center">
                          {r.blueScore ?? "—"}
                          {r.blueDeductions > 0 ? ` (-${r.blueDeductions})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <div className="bg-muted/30 rounded-lg border p-3">
        <p className="font-medium">추천 결과</p>
        <p className="mt-1">{aggregation.recommendedLabel}</p>
        {aggregation.needsOrganizerDecision ? (
          <p className="text-destructive mt-1 text-xs">
            주심/주최자 최종 결정이 필요합니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
