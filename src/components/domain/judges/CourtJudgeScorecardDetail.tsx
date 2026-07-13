"use client";

import { useState } from "react";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { roundWinnerLabel } from "@/lib/court-judge-rounds";
import type { CourtJudgeScorecardVM } from "@/lib/services/judge-court.service";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";

const CORNER_LABEL: Record<string, string> = {
  red: "홍",
  blue: "청",
  draw: "무",
  no_contest: "NC",
  undecided: "—",
};

function ScorecardDetailCard({ scorecard }: { scorecard: CourtJudgeScorecardVM }) {
  return (
    <div className="mt-2 rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{scorecard.judgeName}</p>
        {scorecard.judgeBirthDateSnapshot ? (
          <p className="text-muted-foreground text-xs">{scorecard.judgeBirthDateSnapshot}</p>
        ) : null}
      </div>
      {scorecard.submittedAt ? (
        <p className="text-muted-foreground mt-1 text-xs">
          제출{" "}
          {new Date(scorecard.submittedAt).toLocaleString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[16rem] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">R</th>
              <th className={cn("py-1 px-2 text-center", matchonRedCornerTextClass)}>홍</th>
              <th className={cn("py-1 px-2 text-center", matchonBlueCornerTextClass)}>청</th>
              <th className="py-1 pl-2">승</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.rounds.map((round) => {
              const winner = roundWinnerLabel(round.redScore, round.blueScore);
              return (
                <tr key={round.roundNumber} className="border-t border-border/60">
                  <td className="py-1.5 pr-2 font-medium">{round.roundNumber}</td>
                  <td className={cn("py-1.5 px-2 text-center", matchonRedCornerTextClass)}>{round.redScore ?? "—"}</td>
                  <td className={cn("py-1.5 px-2 text-center", matchonBlueCornerTextClass)}>{round.blueScore ?? "—"}</td>
                  <td className="py-1.5 pl-2">{winner ? CORNER_LABEL[winner] : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span>
          총점 홍 <strong className={matchonRedCornerTextClass}>{scorecard.redTotal ?? "—"}</strong>
        </span>
        <span>
          청 <strong className={matchonBlueCornerTextClass}>{scorecard.blueTotal ?? "—"}</strong>
        </span>
        <span>
          판정 <strong>{CORNER_LABEL[scorecard.winnerCorner]}</strong>
        </span>
      </div>
      {scorecard.memo ? (
        <p className="text-muted-foreground mt-2 text-xs">메모: {scorecard.memo}</p>
      ) : null}
    </div>
  );
}

export function CourtJudgeScorecardInlineList({
  scorecards,
}: {
  scorecards: CourtJudgeScorecardVM[];
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (scorecards.length === 0) {
    return (
      <FeedbackMessage tone="info" className="mt-2 text-sm">
        채점 데이터 없음. 주심판은 채점 없이도 승패 입력·완료가 가능합니다.
      </FeedbackMessage>
    );
  }

  return (
    <ul className="mt-2 space-y-2">
      {scorecards.map((scorecard, index) => {
        const key = `${scorecard.judgeName}-${scorecard.submittedAt ?? index}`;
        const open = expandedKey === key;
        return (
          <li key={key}>
            <Card variant={open ? "selected" : "interactive"} className="py-0">
            <button
              type="button"
              onClick={() => setExpandedKey(open ? null : key)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm",
              )}
            >
              <span className="font-medium">
                {scorecard.judgeName}
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  홍 {scorecard.redTotal ?? "—"} · 청 {scorecard.blueTotal ?? "—"} ·{" "}
                  {CORNER_LABEL[scorecard.winnerCorner]}
                </span>
              </span>
              <span className="text-muted-foreground text-xs">{open ? "접기" : "상세"}</span>
            </button>
            {open ? (
              <CardContent className="border-t px-3 pb-3">
                <ScorecardDetailCard scorecard={scorecard} />
              </CardContent>
            ) : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
