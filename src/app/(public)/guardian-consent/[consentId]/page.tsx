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
  searchParams: Promise<{ token?: string }>;
}) {
  const { consentId } = await params;
  const { token: tokenRaw } = await searchParams;
  const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          title="링크가 올바르지 않습니다"
          description="초대 링크에 포함된 동의 주소 전체를 사용해 주세요."
        />
      </div>
    );
  }

  let session: Awaited<
    ReturnType<typeof consentService.getGuardianConsentPublicSession>
  >;

  try {
    session = await consentService.getGuardianConsentPublicSession(
      consentId,
      token,
    );
  } catch (e: unknown) {
    if (e instanceof AppError) {
      return (
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState title="동의서를 열 수 없습니다" description={e.message} />
        </div>
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
        보호자 동의서
      </h1>
      <GuardianConsentForm
        token={token}
        registrationSubmissionId={session.registrationSubmissionId}
        initial={session.view}
      />
    </div>
  );
}
