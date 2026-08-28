import Link from "next/link";
import {
  dashboardPathForRole,
  requireActor,
} from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const plan = String(params.plan ?? "이용권");
  const amount = Number(params.amount ?? 0);
  const freeMonths = Number(params.freeMonths ?? 0);
  const trialEndAt = String(params.trialEndAt ?? "");
  const periodEnd = String(params.periodEnd ?? "");
  const home = dashboardPathForRole(actor.role);

  function fmt(iso: string) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("ko-KR");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-matchon-text-primary">
        {freeMonths > 0
          ? `${freeMonths}개월 무료 이용이 시작되었습니다.`
          : "결제가 완료되었습니다."}
      </h1>
      <div className="space-y-2 rounded-xl border border-matchon-border bg-white p-5 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-matchon-text-secondary">이용권</span>
          <span className="font-semibold">{plan}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-matchon-text-secondary">결제금액</span>
          <span className="font-semibold">
            {amount.toLocaleString("ko-KR")}원
          </span>
        </div>
        {freeMonths > 0 ? (
          <div className="flex justify-between">
            <span className="text-matchon-text-secondary">무료 이용기간</span>
            <span className="font-semibold">오늘 ~ {fmt(trialEndAt)}</span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-matchon-text-secondary">이용기간</span>
            <span className="font-semibold">오늘 ~ {fmt(periodEnd)}</span>
          </div>
        )}
      </div>
      <Link
        href={home}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-[15px] font-semibold text-primary-foreground"
      >
        MATCHON 시작하기
      </Link>
      <Link
        href="/billing/account"
        className="text-sm font-medium text-matchon-primary underline"
      >
        이용권 현황 보기
      </Link>
    </div>
  );
}
