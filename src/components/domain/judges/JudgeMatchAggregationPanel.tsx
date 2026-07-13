"use client";

import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import type { JudgeMatchAggregationVM } from "@/lib/judge-score-aggregation";
import type { JudgeScorecardRow } from "@/lib/repositories/judge-scorecard.repository";
import {
  matchonBlueCornerTextClass,
  matchonCompactTableWrapClass,
  matchonInfoBannerClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";

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
      <MatchonEmptyState
        title="배정된 심판이 없습니다."
        description="심판 관리에서 계정을 만들고 경기에 배정하세요."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className={matchonInfoBannerClass}>
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

      <div className={matchonCompactTableWrapClass}>
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead className="bg-matchon-primary-light/30">
            <tr>
              <th className="px-3 py-2 font-medium">심판</th>
              <th className="px-3 py-2 font-medium">역할</th>
              <th className={cnCornerHeader("red")}>홍</th>
              <th className={cnCornerHeader("blue")}>청</th>
              <th className="px-3 py-2 font-medium">승자</th>
              <th className="px-3 py-2 font-medium">제출</th>
            </tr>
          </thead>
          <tbody>
            {aggregation.scorecards.map((s) => (
              <tr key={`${s.judgeName}-${s.submittedAt ?? "pending"}`} className="border-t border-matchon-border">
                <td className="px-3 py-2">{s.judgeName}</td>
                <td className="px-3 py-2">{s.roleLabel ?? "—"}</td>
                <td className={cnCornerCell("red")}>{s.redTotal ?? "—"}</td>
                <td className={cnCornerCell("blue")}>{s.blueTotal ?? "—"}</td>
                <td className="px-3 py-2">
                  {CORNER_LABEL[s.winnerCorner] ?? s.winnerCorner}
                </td>
                <td className="px-3 py-2">
                  {s.submitted
                    ? s.submittedAt
                      ? new Date(s.submittedAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "제출"
                    : "미제출"}
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
              <Card key={card.id} variant="default" className="py-3">
                <CardContent className="px-3">
                <p className="font-medium">{card.judgeName}</p>
                <table className="mt-1 w-full">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 text-left">R</th>
                      <th className={cnCornerHeader("red")}>홍</th>
                      <th className={cnCornerHeader("blue")}>청</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.rounds.map((r) => (
                      <tr key={r.roundNumber}>
                        <td className="py-0.5">{r.roundNumber}</td>
                        <td className={cnCornerCell("red")}>
                          {r.redScore ?? "—"}
                          {r.redDeductions > 0 ? ` (-${r.redDeductions})` : ""}
                        </td>
                        <td className={cnCornerCell("blue")}>
                          {r.blueScore ?? "—"}
                          {r.blueDeductions > 0 ? ` (-${r.blueDeductions})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      ) : null}

      <Card variant="muted" className="py-4">
        <CardContent className="px-4">
        <p className="font-medium">추천 결과</p>
        <p className="mt-1">{aggregation.recommendedLabel}</p>
        {aggregation.needsOrganizerDecision ? (
          <p className="text-destructive mt-1 text-xs">
            주심/주최자 최종 결정이 필요합니다.
          </p>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function cnCornerHeader(corner: "red" | "blue") {
  return corner === "red"
    ? `px-3 py-2 font-medium text-center ${matchonRedCornerTextClass}`
    : `px-3 py-2 font-medium text-center ${matchonBlueCornerTextClass}`;
}

function cnCornerCell(corner: "red" | "blue") {
  return corner === "red"
    ? `px-3 py-2 text-center ${matchonRedCornerTextClass}`
    : `px-3 py-2 text-center ${matchonBlueCornerTextClass}`;
}
