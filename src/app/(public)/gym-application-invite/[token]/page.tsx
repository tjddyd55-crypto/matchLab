import Link from "next/link";
import { GymApplicationInviteAcceptForm } from "@/components/domain/gym-applications/GymApplicationInviteAcceptForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { gymApplicationService } from "@/lib/services/gym-application.service";
import { authLoginDescClass, authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymApplicationInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await gymApplicationService.getInviteContextByToken(token);

  if (!ctx.ok) {
    const message =
      ctx.reason === "expired"
        ? "계정 생성 링크가 만료되었습니다. 관리자에게 새 링크를 요청해 주세요."
        : ctx.reason === "already_active"
          ? "이미 활성화된 계정입니다. 로그인 화면에서 설정한 아이디와 비밀번호로 로그인해 주세요."
          : "유효하지 않은 초대 링크입니다.";
    return (
      <AuthLoginShell title="체육관 계정 초대">
        <p className={authLoginDescClass}>{message}</p>
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
      title="체육관 계정 활성화"
      description="아이디와 비밀번호를 설정하면 체육관으로 로그인할 수 있습니다."
    >
      <GymApplicationInviteAcceptForm
        token={token}
        gymName={ctx.gymName}
        contactName={ctx.contactName}
        email={ctx.email}
      />
    </AuthLoginShell>
  );
}
