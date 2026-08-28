import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import {
  adminCreateBillingCouponAction,
  adminToggleBillingCouponFormAction,
} from "@/features/billing/actions";
import { billingService } from "@/lib/services/billing.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { BillingCouponType } from "@/lib/enums";

export const dynamic = "force-dynamic";

function benefitText(c: {
  type: string;
  freeMonths: number | null;
  percentOff: number | null;
  fixedAmountOff: number | null;
}) {
  if (c.type === "FREE_MONTHS") return `${c.freeMonths ?? 0}개월 무료`;
  if (c.type === "PERCENT") return `${c.percentOff ?? 0}% 할인`;
  return `${(c.fixedAmountOff ?? 0).toLocaleString("ko-KR")}원 할인`;
}

export default async function AdminBillingCouponsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);
  const coupons = await billingService.adminListCoupons(actor);

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="쿠폰"
          description="FREE_MONTHS / PERCENT / FIXED_AMOUNT 쿠폰을 생성·관리합니다."
        />

        <form
          action={adminCreateBillingCouponAction}
          className="grid gap-3 rounded-xl border border-matchon-border bg-white p-4 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-sm font-semibold">쿠폰 생성</h2>
          <label className="text-xs">
            쿠폰코드
            <input name="code" required className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            쿠폰명
            <input name="name" required className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            타입
            <select name="type" className="mt-1 w-full rounded border px-2 py-1.5" defaultValue={BillingCouponType.FREE_MONTHS}>
              <option value={BillingCouponType.FREE_MONTHS}>N개월 무료</option>
              <option value={BillingCouponType.PERCENT}>정률 할인</option>
              <option value={BillingCouponType.FIXED_AMOUNT}>정액 할인</option>
            </select>
          </label>
          <label className="text-xs">
            적용 요금제
            <select name="applicablePlan" className="mt-1 w-full rounded border px-2 py-1.5" defaultValue="ALL">
              <option value="ALL">전체</option>
              <option value="MONTHLY">월간</option>
              <option value="YEARLY">연간</option>
            </select>
          </label>
          <label className="text-xs">
            무료 개월 수
            <input name="freeMonths" type="number" min={1} max={36} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            할인율 %
            <input name="percentOff" type="number" min={1} max={100} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            정액 할인(원)
            <input name="fixedAmountOff" type="number" min={1} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            1인 한도
            <input name="perUserLimit" type="number" min={1} defaultValue={1} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            최대 사용 횟수
            <input name="maxRedemptions" type="number" min={1} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            시작일
            <input name="startsAt" type="datetime-local" className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="text-xs">
            만료일
            <input name="expiresAt" type="datetime-local" className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <label className="md:col-span-2 text-xs">
            설명
            <textarea name="description" rows={2} className="mt-1 w-full rounded border px-2 py-1.5" />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">쿠폰 생성</Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-matchon-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">코드</th>
                <th className="px-3 py-2">쿠폰명</th>
                <th className="px-3 py-2">혜택</th>
                <th className="px-3 py-2">적용</th>
                <th className="px-3 py-2">사용량</th>
                <th className="px-3 py-2">기간</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{benefitText(c)}</td>
                  <td className="px-3 py-2">{c.applicablePlan}</td>
                  <td className="px-3 py-2">
                    {c.redemptionCount}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {(c.startsAt ? c.startsAt.toLocaleDateString("ko-KR") : "-") +
                      " ~ " +
                      (c.expiresAt ? c.expiresAt.toLocaleDateString("ko-KR") : "-")}
                  </td>
                  <td className="px-3 py-2">{c.isActive ? "활성" : "비활성"}</td>
                  <td className="px-3 py-2">
                    <form action={adminToggleBillingCouponFormAction}>
                      <input type="hidden" name="couponId" value={c.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={c.isActive ? "false" : "true"}
                      />
                      <Button type="submit" size="xs" variant="outline">
                        {c.isActive ? "비활성" : "활성"}
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
