import type { InviteGateReason } from "@/lib/services/invite-link.service";
import { registrationService } from "@/lib/services/registration.service";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { FighterRegistrationForm } from "@/components/domain/fighters/FighterRegistrationForm";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";

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
        <PublicApplicationEmptyState
          title="등록 링크를 사용할 수 없습니다"
          description={INVALID_MESSAGES[ctx.reason]}
          tone="error"
        />
      </div>
    );
  }

  const heading = `${ctx.gymDisplayLabel} 선수 등록`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:py-12">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {heading}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          체육관 초대 링크로 선수 정보를 등록합니다.
        </p>
      </header>
      <GymFighterRegistrationPolicyNotice />
      <FighterRegistrationForm token={token} heading={heading} />
    </div>
  );
}
