import Link from "next/link";
import { JudgeMatchList } from "@/components/domain/judges/JudgeMatchList";
import { judgeLogoutAction } from "@/features/judge/actions";
import { Button } from "@/components/ui/button";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { judgeScorecardService } from "@/lib/services/judge-scorecard.service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JudgeMatchesPage() {
  let session;
  try {
    session = await judgeCredentialService.assertJudgeSession();
  } catch {
    redirect("/judge/login");
  }

  const matches = await judgeScorecardService.listAssignedMatches(session);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold">배정 경기</h1>
          <p className="text-muted-foreground text-sm">
            본인에게 배정된 경기만 표시됩니다.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await judgeLogoutAction();
            redirect("/judge/login");
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      <JudgeMatchList
        matches={matches}
        judgeNameHint={session.displayName ?? session.loginId}
      />

      <p className="text-muted-foreground text-xs">
        <Link href="/judge/login" className="underline">
          다른 계정으로 로그인
        </Link>
      </p>
    </div>
  );
}
