import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminCreditsPanel } from "@/components/domain/credits/AdminCreditsPanel";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { creditService } from "@/lib/services/credit.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const rows = await creditService.listOrganizersForAdmin();
  const organizers = rows.map((o) => ({
    id: o.id,
    name: o.name,
    balance: o.creditWallet?.balance ?? 0,
  }));

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="주최자 크레딧 관리"
          description="관리자만 수동 충전할 수 있습니다. 모든 잔액 변경은 ledger에 기록됩니다."
        />
        <AdminCreditsPanel organizers={organizers} />
      </div>
    </div>
  );
}
