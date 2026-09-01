import Link from "next/link";
import { GymStaffAccountSetupForm } from "@/components/domain/gym-staff/GymStaffAccountSetupForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { gymStaffAccountSetupService } from "@/lib/services/gym-staff-account-setup.service";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusMessage(status: string): string {
  switch (status) {
    case "expired":
      return "계정 설정 링크가 만료되었습니다.\n소속 체육관에 새 링크 발급을 요청해 주세요.";
    case "used":
      return "이미 사용된 계정 설정 링크입니다.\n로그인 화면에서 로그인해 주세요.";
    case "revoked":
      return "사용할 수 없는 링크입니다.\n소속 체육관에 새 링크를 요청해 주세요.";
    default:
      return "사용할 수 없는 링크입니다.";
  }
}

export default async function GymStaffAccountSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const page = await gymStaffAccountSetupService.getSetupPageByToken(token);

  if (page.status !== "valid") {
    return (
      <AuthLoginShell layout="onboarding" title="유효하지 않은 링크">
        <p className="whitespace-pre-line text-base leading-relaxed text-matchon-text-secondary">
          {statusMessage(page.status)}
        </p>
        <p className={cn(authLoginFooterClass, "mt-4")}>
          <Link
            href="/login"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            로그인
          </Link>
        </p>
      </AuthLoginShell>
    );
  }

  return (
    <AuthLoginShell
      layout="onboarding"
      title="선생님 계정 설정"
      description="MATCHON에서 사용할 로그인 아이디와 비밀번호를 설정해 주세요."
    >
      <GymStaffAccountSetupForm
        token={token}
        staffName={page.staffName}
        gymName={page.gymName}
        existingLoginId={page.existingLoginId}
      />
    </AuthLoginShell>
  );
}
