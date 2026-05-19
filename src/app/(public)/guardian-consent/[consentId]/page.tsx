import Link from "next/link";
import { AppError } from "@/lib/errors/app-error";
import { consentService } from "@/lib/services/consent.service";
import { GuardianConsentForm } from "@/components/domain/consents/GuardianConsentForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <SignEmpty
        title="링크가 올바르지 않습니다"
        description="초대 링크에 포함된 동의 주소 전체를 사용해 주세요."
      />
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
        <SignEmpty title="동의서를 열 수 없습니다" description={e.message} />
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← 홈
        </Link>
      </div>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {scope === "application" ? "대회 신청 보호자 동의" : "보호자 동의서"}
      </h1>
      <GuardianConsentForm
        token={token || undefined}
        registrationSubmissionId={session.registrationSubmissionId}
        documentId={session.documentId}
        scope={session.scope}
        initial={session.view}
      />
    </div>
  );
}

function SignEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <EmptyState title={title} description={description} />
    </div>
  );
}
