import { redirect } from "next/navigation";
import { JudgeMatchAggregationPanel } from "@/components/domain/judges/JudgeMatchAggregationPanel";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";

export const dynamic = "force-dynamic";

export default async function JudgeResultsMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await requireJudgeSessionWithIdentity();
  if (session.role !== "ANNOUNCER") {
    redirect("/judge/matches");
  }

  const { matchId } = await params;
  const aggregation =
    await judgeScorecardService.getMatchAggregationForJudgeSession(
      session,
      matchId,
    );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">발표용 결과</h1>
        <p className="text-muted-foreground text-sm">읽기 전용 — 채점 수정 불가</p>
      </div>
      <JudgeMatchAggregationPanel aggregation={aggregation} />
    </div>
  );
}
