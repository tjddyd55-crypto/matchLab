import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { JudgeScorecardForm } from "@/components/domain/judges/JudgeScorecardForm";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeRoleCanScore, judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";

export const dynamic = "force-dynamic";

export default async function JudgeScorePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await requireJudgeSessionWithIdentity();
  if (!judgeRoleCanScore(session.role)) {
    redirect(judgeDefaultRoute(session.role));
  }

  const { matchId } = await params;

  let form;
  try {
    form = await judgeScorecardService.getScorecardForm(session, matchId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 pb-12">
      <JudgeSessionHeader session={session} />
      <Link
        href="/judge/matches"
        className="text-muted-foreground text-sm underline"
      >
        ← 경기 목록
      </Link>
      <JudgeScorecardForm form={form} verifiedName={session.verifiedName} />
    </div>
  );
}
