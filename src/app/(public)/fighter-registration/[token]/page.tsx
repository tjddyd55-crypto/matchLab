import type { InviteGateReason } from "@/lib/services/invite-link.service";
import { registrationService } from "@/lib/services/registration.service";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { FighterRegistrationForm } from "@/components/domain/fighters/FighterRegistrationForm";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { PublicApplicationPageShell } from "@/components/domain/applications/PublicApplicationPageShell";

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
      <PublicApplicationPageShell title="선수 등록">
        <PublicApplicationEmptyState
          title="등록 링크를 사용할 수 없습니다"
          description={INVALID_MESSAGES[ctx.reason]}
          tone="error"
        />
      </PublicApplicationPageShell>
    );
  }

  const heading = `${ctx.gymDisplayLabel} 선수 등록`;

  return (
    <PublicApplicationPageShell
      title={heading}
      description="체육관 초대 링크로 선수 정보를 등록합니다."
    >
      <GymFighterRegistrationPolicyNotice />
      <FighterRegistrationForm token={token} heading={heading} />
    </PublicApplicationPageShell>
  );
}
