import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { adminUpdateBillingPlanFormAction } from "@/features/billing/actions";
import { billingService } from "@/lib/services/billing.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminBillingPlansPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);
  const plans = await billingService.adminListPlans(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="요금제"
          description="플랫폼 구독 요금제입니다. 과거 결제/구독 snapshot 금액은 변경되지 않습니다. 시드 금액은 보험 CRM billing_plans 패턴을 따랐으며 운영 전 확인하세요."
        />
        <div className="overflow-x-auto rounded-xl border border-matchon-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">코드</th>
                <th className="px-3 py-2">표시명</th>
                <th className="px-3 py-2">주기</th>
                <th className="px-3 py-2">가격(원)</th>
                <th className="px-3 py-2">활성</th>
                <th className="px-3 py-2">저장</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 font-mono text-xs">{plan.code}</td>
                  <td className="px-3 py-2" colSpan={5}>
                    <form
                      action={adminUpdateBillingPlanFormAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="planId" value={plan.id} />
                      <label className="text-xs">
                        표시명
                        <input
                          name="name"
                          defaultValue={plan.name}
                          className="mt-1 block w-40 rounded border px-2 py-1"
                        />
                      </label>
                      <label className="text-xs">
                        가격
                        <input
                          name="price"
                          type="number"
                          min={0}
                          defaultValue={plan.price}
                          className="mt-1 block w-28 rounded border px-2 py-1"
                        />
                      </label>
                      <input type="hidden" name="isActive" value="false" />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          name="isActive"
                          value="true"
                          defaultChecked={plan.isActive}
                        />
                        활성
                      </label>
                      <input
                        type="hidden"
                        name="sortOrder"
                        value={plan.sortOrder}
                      />
                      <span className="text-xs text-matchon-text-secondary">
                        {plan.interval}
                      </span>
                      <Button type="submit" size="sm">
                        저장
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
