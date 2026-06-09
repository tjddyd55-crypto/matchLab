import Link from "next/link";
import { JudgeScorecardForm } from "@/components/domain/judges/JudgeScorecardForm";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JudgeScorePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  let session;
  try {
    session = await judgeCredentialService.assertJudgeSession();
  } catch {
    redirect("/judge/login");
  }

  let form;
  try {
    form = await judgeScorecardService.getScorecardForm(session, matchId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 pb-12">
      <Link
        href="/judge/matches"
        className="text-muted-foreground text-sm underline"
      >
        ← 경기 목록
      </Link>
      <JudgeScorecardForm form={form} />
    </div>
  );
}
