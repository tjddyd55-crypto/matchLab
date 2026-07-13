import { requireActor } from "@/lib/auth/actor";
import { inviteLinkService } from "@/lib/services/invite-link.service";
import { InviteLinkCreateForm } from "@/components/domain/gym/InviteLinkCreateForm";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { getAppBaseUrl } from "@/lib/app-url";
import { InviteLinkStatus, InviteLinkType } from "@/lib/enums";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
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

function resolveInviteLinkMatchonStatus(status: InviteLinkStatus): MatchonStatus {
  switch (status) {
    case "active":
      return "active";
    case "paused":
      return "waiting";
    case "expired":
      return "completed";
    case "revoked":
      return "cancelled";
    default:
      return "inactive";
  }
}

export default async function GymInviteLinksPage() {
  const actor = await requireActor();
  const links = await inviteLinkService.listGymInviteLinks(actor);

  const baseUrl = getAppBaseUrl();

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>초대 링크</h1>
          <p className={matchonPageDescClass}>
            공개 등록 URL은 토큰만 노출되며, 체육관 연락처 등 내부 정보는 포함하지
            않습니다.
          </p>
        </div>

        <GymFighterRegistrationPolicyNotice />

        {actor.gymId ? <InviteLinkCreateForm baseUrl={baseUrl} /> : null}

        {!actor.gymId ? (
          <GymProfileMissingBanner />
        ) : links.length === 0 ? (
          <MatchonEmptyState title="생성된 링크가 없습니다" />
        ) : (
          <div className={matchonCompactTableWrapClass}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-matchon-border bg-matchon-primary-light/25">
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
                    <tr
                      key={link.id}
                      className="border-b border-matchon-border last:border-0"
                    >
                      <td className="px-3 py-2">{TYPE_LABEL[link.type]}</td>
                      <td className="px-3 py-2">
                        <MatchonStatusBadge
                          status={resolveInviteLinkMatchonStatus(link.status)}
                          label={STATUS_LABEL[link.status]}
                          size="sm"
                        />
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
    </div>
  );
}
