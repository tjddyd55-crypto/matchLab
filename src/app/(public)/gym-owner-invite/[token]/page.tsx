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
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold text-matchon-text-primary">
          유효하지 않은 초대
        </h1>
        <p className="mt-2 text-sm text-matchon-text-secondary">
          초대 링크가 만료되었거나 취소되었습니다. 협회에 문의해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-bold">회원사 대표 계정 활성화</h1>
      <p className="mt-2 text-sm text-matchon-text-secondary">
        {ctx.organizerName} · {ctx.gymName}
      </p>
      <p className="mt-1 text-sm">초대 이메일: {ctx.email}</p>
      <div className="mt-6">
        <MemberGymOwnerInviteAcceptForm
          token={token}
          defaultName={ctx.name}
          suggestedLoginId={ctx.email.split("@")[0] || ""}
        />
      </div>
    </main>
  );
}
