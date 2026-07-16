import { AuthLoginNoticeList } from "@/components/domain/auth/AuthLoginNoticeList";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { JudgeLoginForm } from "@/components/domain/judges/JudgeLoginForm";
import { JudgeQrEntryError } from "@/components/domain/judges/JudgeQrEntryError";
import { JUDGE_COUNT_POLICY_LINES } from "@/lib/judge-round-count";
import { judgeDefaultRoute } from "@/lib/judge-identity";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { validateJudgeLoginEntry } from "@/lib/services/judge-qr-entry.service";
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
    <AuthLoginShell
      eyebrow="심판 전용 로그인"
      title="심판 로그인"
      subtitle={
        eventTitle ? (
          <p className="text-[0.9375rem] font-medium text-matchon-text-primary">
            {eventTitle}
          </p>
        ) : null
      }
      description="부여받은 아이디와 비밀번호를 입력해 주세요."
      footer={<AuthLoginNoticeList items={JUDGE_COUNT_POLICY_LINES} />}
    >
      <JudgeLoginForm
        defaultLoginId={defaultLoginId}
        callbackUrl={callbackUrl}
      />
    </AuthLoginShell>
  );
}
