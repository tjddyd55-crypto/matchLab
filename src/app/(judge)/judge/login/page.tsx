import { JudgeLoginForm } from "@/components/domain/judges/JudgeLoginForm";
import { JUDGE_COUNT_POLICY_LINES } from "@/lib/judge-round-count";
import { readJudgeSession } from "@/lib/judge-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JudgeLoginPage() {
  const session = await readJudgeSession();
  if (session) redirect("/judge/matches");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          심판 로그인
        </h1>
        <p className="text-muted-foreground text-sm">
          주최자가 발급한 심판 ID와 비밀번호로 접속합니다.
        </p>
      </header>
      <JudgeLoginForm />
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs leading-relaxed">
        {JUDGE_COUNT_POLICY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
