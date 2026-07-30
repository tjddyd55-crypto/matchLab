import { redirect } from "next/navigation";
import { MemberPortalVerifyForm } from "@/components/domain/gym-member-portal/MemberPortalVerifyForm";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

export const dynamic = "force-dynamic";

export default async function MemberPortalEntryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await gymMemberPortalService.resolvePortal(token);
  if (!resolved.ok) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-16 text-center">
        <p className="text-sm font-semibold text-[#0A47FF]">MATCHON</p>
        <h1 className="mt-3 text-xl font-bold text-[#001C7A]">
          회원 전용 페이지
        </h1>
        <p className="mt-3 whitespace-pre-line text-sm text-[#64748B]">
          {resolved.message}
        </p>
      </main>
    );
  }

  const session = await gymMemberPortalService.requireSession(token);
  if (session) {
    redirect(`/member-portal/${token}/home`);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center py-10">
      <MemberPortalVerifyForm
        token={token}
        gymName={resolved.portal.gymName}
      />
    </main>
  );
}
