import { MemberGymOwnerInviteAcceptForm } from "@/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm";
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
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold text-matchon-text-primary">
          유효하지 않은 초대
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-matchon-text-secondary">
          {message}
        </p>
        <p className="mt-4 text-sm">
          <a href="/login" className="text-matchon-primary underline">
            로그인 화면으로 이동
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 pb-24">
      <h1 className="text-xl font-bold">회원사 대표 계정 활성화</h1>
      <p className="mt-2 text-sm text-matchon-text-secondary">
        {ctx.organizerName}
      </p>
      <div className="mt-6">
        <MemberGymOwnerInviteAcceptForm
          token={token}
          defaultName={ctx.name}
          inviteEmail={ctx.email}
          invitePhone={ctx.phone}
          gymName={ctx.gymName}
        />
      </div>
    </main>
  );
}
