import { AppError } from "@/lib/errors/app-error";
import { additionalInfoService } from "@/lib/services/additional-info.service";
import { AdditionalInfoPublicForm } from "@/components/domain/applications/AdditionalInfoPublicForm";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { PublicApplicationPageShell } from "@/components/domain/applications/PublicApplicationPageShell";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ApplicationInfoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: tokenRaw } = await params;
  const token = tokenRaw.trim();

  if (!token) {
    return (
      <PublicApplicationPageShell layout="onboarding" title="대회 참가 추가정보">
        <PublicApplicationEmptyState
          title="링크가 올바르지 않습니다"
          description="안내받은 링크 전체를 사용해 주세요."
          tone="error"
        />
      </PublicApplicationPageShell>
    );
  }

  try {
    const form = await additionalInfoService.getPublicForm(token);
    return (
      <PublicApplicationPageShell layout="onboarding"
        title="대회 참가 추가정보"
        description="주민등록번호·주소·동의·서명을 입력해 주세요."
        statusBadge={
          form.alreadyCompleted
            ? { status: "application_completed", label: "완료" }
            : { status: "application_pending", label: "작성" }
        }
      >
        <AdditionalInfoPublicForm initial={form} />
      </PublicApplicationPageShell>
    );
  } catch (e: unknown) {
    if (e instanceof AppError) {
      return (
        <PublicApplicationPageShell layout="onboarding" title="대회 참가 추가정보">
          <PublicApplicationEmptyState
            title="추가정보 페이지를 열 수 없습니다"
            description={
              e.code === "NOT_FOUND"
                ? "유효하지 않거나 만료된 링크입니다."
                : e.message
            }
            tone="error"
          />
        </PublicApplicationPageShell>
      );
    }
    throw e;
  }
}
