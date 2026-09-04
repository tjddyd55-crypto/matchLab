import { MessagingProviderOwnerType } from "@/generated/prisma";
import { MessagingProviderSettingsForm } from "@/components/domain/messaging/MessagingProviderSettingsForm";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { messagingProviderSettingsService } from "@/lib/services/messaging-provider-settings.service";

export const dynamic = "force-dynamic";

export default async function GymMessagingSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym"]);
  const access = await resolveGymPortalAccess(actor);
  if (!access.canManageGymSettings) {
    throw new AppError("FORBIDDEN", "체육관 설정을 변경할 권한이 없습니다.");
  }
  const settings = await messagingProviderSettingsService.getSettings(
    actor,
    MessagingProviderOwnerType.gym,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">문자 발송 설정</h1>
        <p className="mt-1 text-sm text-matchon-text-secondary">
          체육관 전용 알리고 계정을 연결합니다.
        </p>
      </div>
      <MessagingProviderSettingsForm initial={settings} />
    </div>
  );
}
