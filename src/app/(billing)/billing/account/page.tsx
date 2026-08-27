import Link from "next/link";
import { redirect } from "next/navigation";
import {
  dashboardPathForRole,
  requireActor,
} from "@/lib/auth/actor";
import { billingService } from "@/lib/services/billing.service";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("ko-KR");
}

function formatKrw(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export default async function BillingAccountPage() {
  const actor = await requireActor();
  if (actor.role === "admin") {
    redirect(dashboardPathForRole(actor.role));
  }
  if (actor.role !== "gym" && actor.role !== "organizer") {
    redirect(dashboardPathForRole(actor.role));
  }

  const [sub, payments] = await Promise.all([
    billingService.getMySubscription(actor),
    billingService.getMyPayments(actor),
  ]);

  const home = dashboardPathForRole(actor.role);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-matchon-text-primary">
          이용권 / 결제관리
        </h1>
        <Link href={home} className="text-sm text-matchon-primary underline">
          서비스로 이동
        </Link>
      </div>

      <section className="space-y-2 rounded-xl border border-matchon-border bg-white p-4 text-sm">
        <h2 className="font-semibold">현재 이용권</h2>
        {sub ? (
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-matchon-text-secondary">요금제</dt>
              <dd>{sub.plan.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-matchon-text-secondary">상태</dt>
              <dd className="font-semibold">{sub.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-matchon-text-secondary">이용기간</dt>
              <dd>
                {fmt(sub.currentPeriodStart)} ~ {fmt(sub.currentPeriodEnd)}
              </dd>
            </div>
            {sub.trialEndAt ? (
              <div className="flex justify-between">
                <dt className="text-matchon-text-secondary">무료 종료일</dt>
                <dd>{fmt(sub.trialEndAt)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-matchon-text-secondary">다음 결제 예정</dt>
              <dd>{fmt(sub.nextBillingAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-matchon-text-secondary">계약 금액</dt>
              <dd>{formatKrw(sub.currentPrice)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-matchon-text-secondary">
            활성화된 이용권이 없습니다.
          </p>
        )}
        {!sub || sub.status === "PENDING" || sub.status === "EXPIRED" ? (
          <Link
            href="/billing/checkout"
            className="mt-3 inline-flex text-sm font-semibold text-matchon-primary underline"
          >
            이용권 선택하기
          </Link>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-semibold">결제내역</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-matchon-border text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{p.plan.name}</p>
                  <p className="text-xs text-matchon-text-secondary">
                    {fmt(p.paidAt ?? p.createdAt)} · {p.status}
                  </p>
                </div>
                <p className="font-semibold">{formatKrw(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
