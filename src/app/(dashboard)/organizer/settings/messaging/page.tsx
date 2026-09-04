import { MessagingProviderOwnerType } from "@/generated/prisma";
import { MessagingProviderSettingsForm } from "@/components/domain/messaging/MessagingProviderSettingsForm";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { messagingProviderSettingsService } from "@/lib/services/messaging-provider-settings.service";

export const dynamic = "force-dynamic";

export default async function AssociationMessagingSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const settings = await messagingProviderSettingsService.getSettings(
    actor,
    MessagingProviderOwnerType.association,
  );

  return (
    <>
      <OrganizerDashboardPageHeader
        title="문자 발송 설정"
        description="협회 전용 알리고 계정을 연결합니다."
      />
      <div className="mt-4">
        <MessagingProviderSettingsForm initial={settings} />
      </div>
    </>
  );
}
