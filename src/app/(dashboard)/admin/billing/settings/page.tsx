import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { AdminBillingSettingsClient } from "@/components/domain/billing/AdminBillingSettingsClient";
import { adminBillingSettingsService } from "@/lib/services/admin-billing-settings.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminBillingSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const vm = await adminBillingSettingsService.getSettingsPage(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="결제 설정"
          description="Toss Payments TEST/LIVE 키를 안전하게 등록·관리합니다. Secret Key 원문은 저장 후 표시되지 않습니다."
        />
        <AdminBillingSettingsClient initial={vm} />
      </div>
    </div>
  );
}
