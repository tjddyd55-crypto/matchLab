import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminCreditsPanel } from "@/components/domain/credits/AdminCreditsPanel";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { creditService } from "@/lib/services/credit.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizerId?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const { organizerId } = await searchParams;
  const rows = await creditService.listOrganizersForAdmin();
  const organizers = rows.map((o) => ({
    id: o.id,
    name: o.name,
    balance:
      o.billingAccount?.wallet?.balance ?? o.creditWallet?.balance ?? 0,
  }));

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="크레딧 관리"
          description="플랫폼 전체 주최자(Organizer) 크레딧입니다. 조직 상세의 크레딧 탭은 해당 조직 중심 보기입니다."
        />
        <AdminCreditsPanel
          organizers={organizers}
          initialOrganizerId={organizerId}
        />
      </div>
    </div>
  );
}
