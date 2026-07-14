import { MatchonLogo } from "@/components/common/MatchonLogo";
import { MemberGymRegistrationForm } from "@/components/domain/member-gyms/MemberGymRegistrationForm";
import { memberGymService } from "@/lib/services/member-gym.service";
import { matchonPageDescClass, matchonPageTitleClass } from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function MemberGymRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await memberGymService.getPublicRegistrationContext(token);

  if (!ctx.ok) {
    const messages: Record<string, string> = {
      not_found: "유효하지 않은 가입 링크입니다.",
      inactive: "비활성화된 가입 링크입니다.",
      revoked: "폐기된 가입 링크입니다.",
      expired: "만료된 가입 링크입니다.",
      max_uses: "사용 횟수가 초과된 가입 링크입니다.",
      organizer: "이 링크로 가입할 수 없습니다.",
    };
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <MatchonLogo variant="light" size="sm" />
        <h1 className={matchonPageTitleClass}>가입 링크 오류</h1>
        <p className={matchonPageDescClass}>
          {messages[ctx.reason] ?? "가입 링크를 확인할 수 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <MatchonLogo variant="light" size="sm" />
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
        Association Member Join
      </p>
      <h1 className={matchonPageTitleClass}>회원사 가입 신청</h1>
      <p className={matchonPageDescClass}>{ctx.link.label}</p>
      <div className="mt-6">
        <MemberGymRegistrationForm
          token={token}
          organizerName={ctx.link.organizerName}
          guideMessage={ctx.settings.joinLink.guideMessage}
          settings={ctx.settings}
          guideFiles={ctx.link.attachments}
        />
      </div>
    </div>
  );
}
