import { JudgeIdentityForm } from "@/components/domain/judges/JudgeIdentityForm";
import { JudgeSessionHeader } from "@/components/domain/judges/JudgeSessionHeader";
import { assertJudgeSessionOrRedirect } from "@/lib/judge-gate";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";

export const dynamic = "force-dynamic";

export default async function JudgeVerifyPage() {
  const session = await assertJudgeSessionOrRedirect();
  const initial = await judgeCredentialService.getIdentityForm(session);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 pb-10">
      <JudgeSessionHeader session={session} />
      <div className="space-y-2">
        <h1 className="font-heading text-xl font-semibold">심판 본인 확인</h1>
        <p className="text-muted-foreground text-sm">
          채점 기록에 남을 심판 정보를 확인해 주세요.
        </p>
      </div>
      <JudgeIdentityForm session={session} initial={initial} />
    </div>
  );
}
