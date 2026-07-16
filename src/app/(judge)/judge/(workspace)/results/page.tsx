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
  matchonInfoBannerClass,
  matchonPageDescClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
  matchonRedCornerTextClass,
} from "@/lib/ui/judge-ui";

export const dynamic = "force-dynamic";

export default async function JudgeResultsPage() {
  const session = await requireJudgeSessionWithIdentity();
  if (session.role !== "ANNOUNCER") {
    redirect(judgeDefaultRoute(session.role));
  }

  const matches = await judgeScorecardService.listEventMatchesForHeadJudge(
    session,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className={matchonPageHeaderStackClass}>
        <h1 className={matchonPageTitleClass}>결과 발표</h1>
        <p className={matchonPageDescClass}>
          발표용 결과만 확인할 수 있습니다. 채점 상세는 수정할 수 없습니다.
        </p>
        <p className={matchonInfoBannerClass}>
          최종 확정 전 결과는 참고용입니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <MatchonEmptyState title="발표할 경기가 없습니다." />
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
                href={`/judge/results/${m.matchId}`}
                className="text-matchon-primary text-xs font-medium underline"
              >
                발표용 보기
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
