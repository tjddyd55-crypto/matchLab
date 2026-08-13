import { GymMemberSelfRegistrationPublicForm } from "@/components/domain/gym-member-self-registration/GymMemberSelfRegistrationPublicForm";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";

export const dynamic = "force-dynamic";

export default async function GymMemberSelfRegisterPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await gymMemberSelfRegistrationService.getPublicContext(token);

  if (!ctx.ok) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-16 text-center">
        <p className="text-sm font-semibold text-matchon-primary">MATCHON</p>
        <h1 className="mt-3 text-xl font-bold text-matchon-text-primary">
          현재 회원 등록을 받을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-matchon-text-secondary">
          링크가 만료되었거나 사용 중지되었습니다. 체육관 데스크에 문의해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-matchon-surface">
      <GymMemberSelfRegistrationPublicForm
        token={token}
        gymName={ctx.gymName}
        terms={{
          title: ctx.termsTitle,
          version: ctx.termsVersion,
          content: ctx.termsContent,
        }}
      />
    </main>
  );
}
