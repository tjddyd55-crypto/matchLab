import { AppError } from "@/lib/errors/app-error";
import { fighterConsentService } from "@/lib/services/fighter-consent.service";
import { AthleteApplicationSignForm } from "@/components/domain/applications/AthleteApplicationSignForm";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { PublicApplicationPageShell } from "@/components/domain/applications/PublicApplicationPageShell";

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
      <div className="mx-auto max-w-lg px-4 py-12">
        <PublicApplicationEmptyState
          title="링크가 올바르지 않습니다"
          description="서명 링크 전체를 사용해 주세요."
          tone="error"
        />
      </div>
    );
  }

  let session: Awaited<ReturnType<typeof fighterConsentService.getPublicSignSession>>;

  try {
    session = await fighterConsentService.getPublicSignSession(token);
  } catch (e: unknown) {
    if (e instanceof AppError) {
      return (
        <div className="mx-auto max-w-lg px-4 py-12">
          <PublicApplicationEmptyState
            title="서명 페이지를 열 수 없습니다"
            description={
              e.code === "NOT_FOUND"
                ? "유효하지 않거나 만료된 링크입니다."
                : e.message
            }
            tone="error"
          />
        </div>
      );
    }
    throw e;
  }

  return (
    <PublicApplicationPageShell
      title="대회 신청서 서명"
      description="선수 본인 서명과 필수 동의를 완료해 주세요."
    >
      <AthleteApplicationSignForm initial={session} />
    </PublicApplicationPageShell>
  );
}
