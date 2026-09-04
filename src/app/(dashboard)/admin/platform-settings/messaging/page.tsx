import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminPlatformMessagingSettingsClient } from "@/components/domain/platform-messaging/AdminPlatformMessagingSettingsClient";
import { adminPlatformMessagingSettingsService } from "@/lib/services/platform-auth-sms.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminPlatformMessagingSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const vm = await adminPlatformMessagingSettingsService.getSettings(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="플랫폼 문자 설정"
          description="MATCHON 공용 Aligo 계정을 설정합니다. 회원가입·비밀번호 재설정 인증문자에 사용되며, 협회/체육관 tenant 문자와 분리됩니다."
        />
        <AdminPlatformMessagingSettingsClient initial={vm} />
      </div>
    </div>
  );
}
