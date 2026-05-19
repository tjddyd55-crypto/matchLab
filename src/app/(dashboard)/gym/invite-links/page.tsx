import { requireActor } from "@/lib/auth/actor";
import { inviteLinkService } from "@/lib/services/invite-link.service";
import { InviteLinkCreateForm } from "@/components/domain/gym/InviteLinkCreateForm";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { EmptyState } from "@/components/shared/EmptyState";
import { InviteLinkStatus, InviteLinkType } from "@/lib/enums";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<InviteLinkType, string> = {
  fighter_registration: "선수 등록",
  guardian_consent: "보호자 동의",
};

const STATUS_LABEL: Record<InviteLinkStatus, string> = {
  active: "활성",
  paused: "일시중지",
  expired: "만료",
  revoked: "폐기",
};

export default async function GymInviteLinksPage() {
  const actor = await requireActor();
  const links = await inviteLinkService.listGymInviteLinks(actor);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          초대 링크
        </h1>
        <p className="text-muted-foreground text-sm">
          공개 등록 URL은 토큰만 노출되며, 체육관 연락처 등 내부 정보는 포함하지
          않습니다.
        </p>
      </div>

      <GymFighterRegistrationPolicyNotice />

      {actor.gymId ? <InviteLinkCreateForm baseUrl={baseUrl} /> : null}

      {!actor.gymId ? (
        <EmptyState
          title="체육관 계정이 필요합니다"
          description="관장 계정으로 로그인 후 초대 링크를 생성할 수 있습니다."
        />
      ) : links.length === 0 ? (
        <EmptyState title="생성된 링크가 없습니다" />
      ) : (
        <div className="ring-foreground/10 overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 font-medium">유형</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">만료</th>
                <th className="px-3 py-2 font-medium">사용</th>
                <th className="px-3 py-2 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const url = `${baseUrl}/fighter-registration/${link.token}`;
                return (
                  <tr key={link.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{TYPE_LABEL[link.type]}</td>
                    <td className="text-muted-foreground px-3 py-2">
                      {STATUS_LABEL[link.status]}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-xs whitespace-nowrap">
                      {link.expiresAt
                        ? format(link.expiresAt, "yyyy.MM.dd HH:mm", {
                            locale: ko,
                          })
                        : "—"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {link.maxUses != null
                        ? `${link.usedCount} / ${link.maxUses}`
                        : `${link.usedCount} / ∞`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex max-w-xs flex-col gap-2">
                        <span className="font-mono text-[11px] break-all">
                          {url}
                        </span>
                        <CopyInviteUrlButton url={url} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
