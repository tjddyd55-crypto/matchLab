import Link from "next/link";
import { redirect } from "next/navigation";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";

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
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">결과 발표</h1>
        <p className="text-muted-foreground text-sm">
          발표용 결과만 확인할 수 있습니다. 채점 상세는 수정할 수 없습니다.
        </p>
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          최종 확정 전 결과는 참고용입니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">발표할 경기가 없습니다.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {matches.map((m) => (
            <li key={m.matchId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  #{m.matchNumber ?? "—"} {m.fighterRedName} vs {m.fighterBlueName}
                </p>
                <p className="text-muted-foreground text-xs">
                  제출 {m.submittedCount}/{m.assignedCount}
                </p>
              </div>
              <Link
                href={`/judge/results/${m.matchId}`}
                className="text-primary text-xs underline"
              >
                발표용 보기
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
