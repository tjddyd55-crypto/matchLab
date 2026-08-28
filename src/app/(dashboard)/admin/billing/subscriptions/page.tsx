import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { billingService } from "@/lib/services/billing.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("ko-KR");
}

export default async function AdminBillingSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);
  const sp = await searchParams;
  const rows = await billingService.adminListSubscriptions(actor, {
    status: sp.status,
    q: sp.q,
  });

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="구독"
          description="플랫폼 구독 현황입니다. ACTIVE / TRIAL / PAST_DUE / CANCELLED / EXPIRED 필터를 지원합니다."
        />
        <form className="flex flex-wrap gap-2">
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="">전체 상태</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PENDING">PENDING</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="회원명 / 아이디 / 전화"
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
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">요금제</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">월/연</th>
                <th className="px-3 py-2">이용기간</th>
                <th className="px-3 py-2">다음 결제</th>
                <th className="px-3 py-2">자동갱신</th>
                <th className="px-3 py-2">결제수단</th>
                <th className="px-3 py-2">쿠폰</th>
                <th className="px-3 py-2">금액</th>
                <th className="px-3 py-2">가입일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-matchon-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.user.name}</div>
                    <div className="text-xs text-matchon-text-secondary">
                      {s.user.loginId ?? s.user.email ?? s.user.id}
                    </div>
                  </td>
                  <td className="px-3 py-2">{s.plan.name}</td>
                  <td className="px-3 py-2 font-semibold">{s.status}</td>
                  <td className="px-3 py-2">{s.billingInterval}</td>
                  <td className="px-3 py-2 text-xs">
                    {fmt(s.currentPeriodStart)} ~ {fmt(s.currentPeriodEnd)}
                  </td>
                  <td className="px-3 py-2 text-xs">{fmt(s.nextBillingAt)}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.cancelAtPeriodEnd
                      ? "해지예약"
                      : s.autoRenew
                        ? "ON"
                        : "OFF"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.paymentMethod && !s.paymentMethod.deletedAt
                      ? `****${s.paymentMethod.cardLast4 ?? "----"}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.redemptions[0]?.coupon.code ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    {s.currentPrice.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-2 text-xs">{fmt(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-matchon-text-secondary">
              구독 데이터가 없습니다.{" "}
              <Link href="/admin/billing/plans" className="underline">
                요금제
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
