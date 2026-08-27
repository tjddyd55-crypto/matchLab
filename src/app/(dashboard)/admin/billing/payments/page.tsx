import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { billingService } from "@/lib/services/billing.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleString("ko-KR");
}

export default async function AdminBillingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);
  const sp = await searchParams;
  const rows = await billingService.adminListPayments(actor, { q: sp.q });

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="결제 내역"
          description="플랫폼 구독 결제 이력입니다. 카드 원문은 저장하지 않습니다."
        />
        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="주문번호 / 회원명 / 아이디"
            className="rounded border px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            검색
          </button>
        </form>
        <div className="overflow-x-auto rounded-xl border border-matchon-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">결제일</th>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">주문번호</th>
                <th className="px-3 py-2">요금제</th>
                <th className="px-3 py-2">원금</th>
                <th className="px-3 py-2">할인</th>
                <th className="px-3 py-2">실결제</th>
                <th className="px-3 py-2">쿠폰</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">수단</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2 text-xs">
                    {fmt(p.paidAt ?? p.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.user.name}</div>
                    <div className="text-xs text-matchon-text-secondary">
                      {p.user.loginId ?? "-"}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{p.orderId}</td>
                  <td className="px-3 py-2">{p.plan.name}</td>
                  <td className="px-3 py-2">
                    {p.originalAmount.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2">
                    {p.discountAmount.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {p.amount.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {p.redemptions[0]?.coupon.code ?? "-"}
                  </td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.paymentMethod ?? p.provider}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-matchon-text-secondary">
              결제 내역이 없습니다.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
