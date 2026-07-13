import Link from "next/link";
import { redirect } from "next/navigation";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import {
  matchonBlueCornerTextClass,
  matchonPageDescClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";

export const dynamic = "force-dynamic";

export default async function JudgeReviewPage() {
  const session = await requireJudgeSessionWithIdentity();
  if (session.role !== "HEAD_JUDGE") {
    redirect(judgeDefaultRoute(session.role));
  }

  const matches = await judgeScorecardService.listEventMatchesForHeadJudge(
    session,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className={matchonPageHeaderStackClass}>
        <h1 className={matchonPageTitleClass}>채점 집계</h1>
        <p className={matchonPageDescClass}>
          경기별 심판 제출 현황과 집계를 확인합니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <MatchonEmptyState title="집계할 경기가 없습니다." />
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.matchId}>
              <Card variant="default" className="py-0">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  #{m.matchNumber ?? "—"}{" "}
                  <span className={matchonRedCornerTextClass}>{m.fighterRedName}</span>
                  <span className="text-muted-foreground mx-1">vs</span>
                  <span className={matchonBlueCornerTextClass}>{m.fighterBlueName}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  제출 {m.submittedCount}/{m.assignedCount}
                </p>
              </div>
              <Link
                href={`/judge/review/${m.matchId}`}
                className="text-matchon-primary text-xs font-medium underline"
              >
                상세 집계
              </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
