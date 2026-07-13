import { JudgeLoginForm } from "@/components/domain/judges/JudgeLoginForm";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { JUDGE_COUNT_POLICY_LINES } from "@/lib/judge-round-count";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { validateJudgeLoginEntry } from "@/lib/services/judge-qr-entry.service";
import {
  matchonPageDescClass,
  matchonPageEyebrowClass,
  matchonPageHeaderStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/judge-ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function buildLoginCallbackPath(
  eventId: string,
  loginId: string,
): string | undefined {
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  if (loginId) params.set("loginId", loginId);
  if (params.size === 0) return undefined;
  return `/judge/login?${params.toString()}`;
}

export default async function JudgeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; loginId?: string }>;
}) {
  const sp = await searchParams;
  const eventId = sp.eventId?.trim() ?? "";
  const defaultLoginId = sp.loginId?.trim() ?? "";
  const callbackUrl = buildLoginCallbackPath(eventId, defaultLoginId);

  try {
    const session = await judgeCredentialService.assertJudgeSession();
    if (!session.identityConfirmedAt) {
      redirect("/judge/verify");
    }
    redirect(judgeDefaultRoute(session.role));
  } catch {
    // not logged in — QR 스캔 후 로그인 화면 표시 (QR 오류 아님)
  }

  let eventTitle: string | null = null;
  if (eventId) {
    const validation = await validateJudgeLoginEntry(eventId);
    if (!validation.ok) {
      return (
        <JudgeQrEntryError reason={validation.reason} qrType="judge-login" />
      );
    }
    eventTitle = validation.eventTitle;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <MatchonLogo size="md" variant="light" className="justify-center" />
      <header className={matchonPageHeaderStackClass}>
        <p className={matchonPageEyebrowClass}>
          심판 전용 로그인
        </p>
        <h1 className={matchonPageTitleClass}>
          심판 로그인
        </h1>
        {eventTitle ? (
          <p className="text-sm font-medium text-matchon-text-primary">{eventTitle}</p>
        ) : null}
        <p className={matchonPageDescClass}>
          부여받은 아이디와 비밀번호를 입력해 주세요.
        </p>
      </header>
      <JudgeLoginForm
        defaultLoginId={defaultLoginId}
        callbackUrl={callbackUrl}
      />
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs leading-relaxed">
        {JUDGE_COUNT_POLICY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
