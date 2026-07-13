"use client";

import Link from "next/link";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { JudgeMatchListItemVM } from "@/lib/services/judge-scorecard.service";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  matchonBlueCornerTextClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";

const STATUS_LABEL: Record<string, string> = {
  none: "미작성",
  draft: "임시 저장",
  submitted: "제출 완료",
  locked: "잠김",
};

function resolveScorecardMatchonStatus(status: string): MatchonStatus {
  switch (status) {
    case "locked":
      return "completed";
    case "submitted":
      return "signature_completed";
    case "draft":
      return "in_progress";
    default:
      return "waiting";
  }
}

export function JudgeMatchList({
  matches,
  judgeNameHint,
}: {
  matches: JudgeMatchListItemVM[];
  judgeNameHint: string | null;
}) {
  if (matches.length === 0) {
    return (
      <MatchonEmptyState
        title="배정된 경기가 없습니다."
        description="주최자에게 심판 배정을 요청해 주세요."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li key={m.matchId}>
          <Card variant="default" className="py-4">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 px-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                {m.eventTitle}
                {m.matchNumber != null ? ` · ${m.matchNumber}경기` : ""}
              </p>
              <p className="font-medium">
                <span className={matchonRedCornerTextClass}>
                  {m.fighterRedName}
                </span>
                <span className="text-muted-foreground mx-2">vs</span>
                <span className={matchonBlueCornerTextClass}>
                  {m.fighterBlueName}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                {[m.divisionLabel, `${m.roundCount}라운드`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">채점</span>
                <MatchonStatusBadge
                  status={resolveScorecardMatchonStatus(m.scorecardStatus)}
                  label={STATUS_LABEL[m.scorecardStatus] ?? m.scorecardStatus}
                  size="sm"
                />
              </div>
            </div>
            <Link
              href={`/judge/matches/${m.matchId}/score`}
              className={cn(
                buttonVariants({
                  size: "field",
                  variant: m.isLocked ? "outline" : "default",
                }),
              )}
            >
              {m.isLocked ? "보기" : "채점하기"}
            </Link>
            </CardContent>
          </Card>
        </li>
      ))}
      {judgeNameHint ? (
        <p className="text-muted-foreground text-xs">
          로그인 계정: {judgeNameHint}
        </p>
      ) : null}
    </ul>
  );
}
