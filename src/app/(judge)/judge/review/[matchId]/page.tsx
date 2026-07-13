import { redirect } from "next/navigation";
import { JudgeMatchAggregationPanel } from "@/components/domain/judges/JudgeMatchAggregationPanel";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import {
  matchonInfoBannerClass,
  matchonPageDescClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/judge-ui";

export const dynamic = "force-dynamic";

export default async function JudgeReviewMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await requireJudgeSessionWithIdentity();
  if (session.role !== "HEAD_JUDGE") {
    redirect(judgeDefaultRoute(session.role));
  }

  const { matchId } = await params;
  const aggregation =
    await judgeScorecardService.getMatchAggregationForJudgeSession(
      session,
      matchId,
    );
  const scorecards = await judgeScorecardRepository.listByMatch(matchId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className={matchonPageHeaderStackClass}>
        <h1 className={matchonPageTitleClass}>경기 채점 집계</h1>
        <p className={matchonPageDescClass}>
          최종 확정 전 결과는 참고용입니다.
        </p>
        <p className={matchonInfoBannerClass}>
          심판 채점은 참고용이며, 최종 확정은 결과 입력에서 진행합니다.
        </p>
      </div>
      <JudgeMatchAggregationPanel aggregation={aggregation} scorecards={scorecards} />
    </div>
  );
}
