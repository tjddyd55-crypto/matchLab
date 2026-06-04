import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminCreditsPanel } from "@/components/domain/credits/AdminCreditsPanel";
import { creditService } from "@/lib/services/credit.service";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          주최자 크레딧 관리
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          관리자만 수동 충전할 수 있습니다. 모든 잔액 변경은 ledger에
          기록됩니다.
        </p>
      </div>
      <AdminCreditsPanel organizers={organizers} />
    </div>
  );
}
