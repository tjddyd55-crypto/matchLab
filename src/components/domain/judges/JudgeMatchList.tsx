"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JudgeMatchListItemVM } from "@/lib/services/judge-scorecard.service";

const STATUS_LABEL: Record<string, string> = {
  none: "미작성",
  draft: "임시 저장",
  submitted: "제출 완료",
  locked: "잠김",
};

export function JudgeMatchList({
  matches,
  judgeNameHint,
}: {
  matches: JudgeMatchListItemVM[];
  judgeNameHint: string | null;
}) {
  if (matches.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        배정된 경기가 없습니다. 주최자에게 심판 배정을 요청해 주세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li
          key={m.matchId}
          className="border-border bg-card rounded-lg border p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                {m.eventTitle}
                {m.matchNumber != null ? ` · ${m.matchNumber}경기` : ""}
              </p>
              <p className="font-medium">
                <span className="text-red-600 dark:text-red-400">
                  {m.fighterRedName}
                </span>
                <span className="text-muted-foreground mx-2">vs</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {m.fighterBlueName}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                {[m.divisionLabel, `${m.roundCount}라운드`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-muted-foreground text-xs">
                채점: {STATUS_LABEL[m.scorecardStatus] ?? m.scorecardStatus}
              </p>
            </div>
            <Link
              href={`/judge/matches/${m.matchId}/score`}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: m.isLocked ? "outline" : "default",
                }),
              )}
            >
              {m.isLocked ? "보기" : "채점하기"}
            </Link>
          </div>
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
