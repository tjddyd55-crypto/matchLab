import Link from "next/link";
import { AppError } from "@/lib/errors/app-error";
import { fighterConsentService } from "@/lib/services/fighter-consent.service";
import { AthleteApplicationSignForm } from "@/components/domain/applications/AthleteApplicationSignForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApplicationSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: tokenRaw } = await params;
  const token = tokenRaw.trim();

  if (!token) {
    return (
      <SignEmpty
        title="링크가 올바르지 않습니다"
        description="서명 링크 전체를 사용해 주세요."
      />
    );
  }

  let session: Awaited<ReturnType<typeof fighterConsentService.getPublicSignSession>>;

  try {
    session = await fighterConsentService.getPublicSignSession(token);
  } catch (e: unknown) {
    if (e instanceof AppError) {
      return (
        <SignEmpty title="서명 페이지를 열 수 없습니다" description={e.message} />
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← 홈
        </Link>
      </div>
      <h1 className="font-heading mb-6 text-2xl font-semibold">대회 신청서 서명</h1>
      <AthleteApplicationSignForm initial={session} />
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
