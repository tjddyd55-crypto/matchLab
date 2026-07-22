import { notFound } from "next/navigation";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { MatchonMessagingTestConsole } from "@/components/domain/messaging/MatchonMessagingTestConsole";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { loadMatchonMessagingConfig } from "@/lib/matchon-messaging";
import { matchonMessageTemplateService } from "@/server/messaging/services/matchon-message-template.service";

export const dynamic = "force-dynamic";

export default async function AdminMessagingTestPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const config = loadMatchonMessagingConfig();
  if (!config.adminUiEnabled) notFound();

  const templates = await matchonMessageTemplateService.list();

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="메시징 테스트"
          description="DRY_RUN 전용입니다. 실제 문자·알림톡은 발송되지 않습니다."
        />
        <MatchonMessagingTestConsole
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            channel: t.channel,
          }))}
        />
      </div>
    </div>
  );
}
