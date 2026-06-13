import Link from "next/link";
import { redirect } from "next/navigation";
import { JudgeMatchList } from "@/components/domain/judges/JudgeMatchList";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";

export const dynamic = "force-dynamic";

export default async function JudgeMatchesPage() {
  const session = await requireJudgeSessionWithIdentity();

  if (session.role !== "SCORING_JUDGE") {
    redirect(judgeDefaultRoute(session.role));
  }

  const matches = await judgeScorecardService.listAssignedMatches(session);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />

      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">배정 경기</h1>
        <p className="text-muted-foreground text-sm">
          본인에게 배정된 경기만 표시됩니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          아직 배정된 경기가 없습니다. 주최자에게 문의해 주세요.
        </p>
      ) : (
        <JudgeMatchList
          matches={matches}
          judgeNameHint={session.verifiedName ?? session.loginId}
        />
      )}

      <p className="text-muted-foreground text-xs">
        <Link href="/judge/login" className="underline">
          다른 계정으로 로그인
        </Link>
      </p>
    </div>
  );
}
