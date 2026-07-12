import { AppError } from "@/lib/errors/app-error";
import { consentService } from "@/lib/services/consent.service";
import { GuardianConsentForm } from "@/components/domain/consents/GuardianConsentForm";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { PublicApplicationPageShell } from "@/components/domain/applications/PublicApplicationPageShell";

export const dynamic = "force-dynamic";

export default async function GuardianConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ consentId: string }>;
  searchParams: Promise<{ token?: string; scope?: string }>;
}) {
  const { consentId } = await params;
  const { token: tokenRaw, scope: scopeRaw } = await searchParams;
  const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
  const scope = scopeRaw === "application" ? "application" : "registration";

  if (scope === "registration" && !token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <PublicApplicationEmptyState
          title="링크가 올바르지 않습니다"
          description="초대 링크에 포함된 동의 주소 전체를 사용해 주세요."
          tone="error"
        />
      </div>
    );
  }

  let session: Awaited<
    ReturnType<typeof consentService.getGuardianConsentPublicSession>
  >;

  try {
    session = await consentService.getGuardianConsentPublicSession(consentId, {
      token: token || undefined,
      scope,
    });
  } catch (e: unknown) {
    if (e instanceof AppError) {
      return (
        <div className="mx-auto max-w-lg px-4 py-12">
          <PublicApplicationEmptyState
            title="동의서를 열 수 없습니다"
            description={e.message}
            tone="error"
          />
        </div>
      );
    }
    throw e;
  }

  return (
    <PublicApplicationPageShell
      title={
        scope === "application" ? "대회 신청 보호자 동의" : "보호자 동의서"
      }
      description="보호자 정보 확인, 필수 동의, 서명을 완료해 주세요."
    >
      <GuardianConsentForm
        token={token || undefined}
        registrationSubmissionId={session.registrationSubmissionId}
        documentId={session.documentId}
        scope={session.scope}
        initial={session.view}
      />
    </PublicApplicationPageShell>
  );
}
