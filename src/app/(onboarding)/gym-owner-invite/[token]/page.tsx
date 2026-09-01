import { MemberGymOwnerInviteAcceptForm } from "@/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { gymOwnerAccountService } from "@/lib/services/gym-owner-account.service";

export const dynamic = "force-dynamic";

export default async function GymOwnerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await gymOwnerAccountService.getInviteContextByToken(token);

  if (!ctx.ok) {
    const message =
      ctx.reason === "expired"
        ? "계정 생성 링크가 만료되었습니다. 협회에 새 링크를 요청해 주세요."
        : "이미 활성화된 계정입니다. 로그인 화면에서 설정한 아이디와 비밀번호로 로그인해 주세요.";
    return (
      <AuthLoginShell layout="onboarding" title="유효하지 않은 초대">
        <p className="whitespace-pre-line text-base leading-relaxed text-matchon-text-secondary">
          {message}
        </p>
      </AuthLoginShell>
    );
  }

  return (
    <AuthLoginShell
      layout="onboarding"
      title="회원사 대표 계정 활성화"
      description={ctx.organizerName}
    >
      <MemberGymOwnerInviteAcceptForm
        token={token}
        defaultName={ctx.name}
        inviteEmail={ctx.email}
        invitePhone={ctx.phone}
        gymName={ctx.gymName}
      />
    </AuthLoginShell>
  );
}
