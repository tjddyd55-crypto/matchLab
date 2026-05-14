import type { InviteGateReason } from "@/lib/services/invite-link.service";
import { registrationService } from "@/lib/services/registration.service";
import { FighterRegistrationForm } from "@/components/domain/fighters/FighterRegistrationForm";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

const INVALID_MESSAGES: Record<InviteGateReason, string> = {
  not_found: "유효하지 않은 초대 링크입니다.",
  inactive: "비활성화된 초대 링크입니다.",
  expired: "만료된 초대 링크입니다.",
  max_uses: "사용 가능한 횟수를 모두 사용했습니다.",
};

export default async function FighterRegistrationPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await registrationService.getRegistrationFormByToken(token);

  if (!ctx.valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          title="등록 링크를 사용할 수 없습니다"
          description={INVALID_MESSAGES[ctx.reason]}
        />
      </div>
    );
  }

  const heading = `${ctx.gymDisplayLabel} 선수 등록`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FighterRegistrationForm token={token} heading={heading} />
    </div>
  );
}
