import Link from "next/link";
import { redirect } from "next/navigation";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { requireJudgeSessionWithIdentity } from "@/lib/judge-gate";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";

export const dynamic = "force-dynamic";

export default async function JudgeReviewPage() {
  const session = await requireJudgeSessionWithIdentity();
  if (session.role !== "HEAD_JUDGE") {
    redirect("/judge/matches");
  }

  const matches = await judgeScorecardService.listEventMatchesForHeadJudge(
    session,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">채점 집계</h1>
        <p className="text-muted-foreground text-sm">
          경기별 심판 제출 현황과 집계를 확인합니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">집계할 경기가 없습니다.</p>
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
                href={`/judge/review/${m.matchId}`}
                className="text-primary text-xs underline"
              >
                상세 집계
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
