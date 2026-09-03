import Link from "next/link";
import { BillingAccountActions } from "@/components/domain/billing/BillingAccountActions";
import { matchonPageContainerClass, matchonPageStackClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";
import type { billingService } from "@/lib/services/billing.service";

type Subscription = Awaited<
  ReturnType<typeof billingService.getMySubscription>
>;
type Payment = Awaited<
  ReturnType<typeof billingService.getMyPayments>
>[number];

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("ko-KR");
}

function formatKrw(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function subscriptionStatusLabel(
  status: string,
  cancelAtPeriodEnd: boolean,
): string {
  if (cancelAtPeriodEnd) return "해지 예정";
  switch (status) {
    case "TRIAL":
      return "체험 중";
    case "ACTIVE":
      return "사용 중";
    case "PAST_DUE":
      return "결제 필요";
    case "CANCELLED":
      return "해지 예정";
    case "EXPIRED":
      return "만료";
    case "PENDING":
      return "대기";
    default:
      return status;
  }
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "결제완료";
    case "READY":
      return "대기";
    case "FAILED":
      return "실패";
    case "CANCELLED":
      return "취소";
    case "REFUNDED":
      return "환불";
    default:
      return status;
  }
}

function receiptUrlFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const url = m.receiptUrl ?? m.receipt_url;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

export function BillingAccountView({
  sub,
  payments,
  serviceHomeHref,
  embeddedInDashboard = false,
}: {
  sub: Subscription;
  payments: Payment[];
  serviceHomeHref?: string | null;
  embeddedInDashboard?: boolean;
}) {
  const method = sub?.paymentMethod;

  return (
    <div
      className={cn(
        embeddedInDashboard
          ? cn(matchonPageContainerClass, "desktop-static-page-fill")
          : "mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8",
      )}
    >
      <div className={embeddedInDashboard ? matchonPageStackClass : "flex flex-col gap-6"}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-matchon-text-primary">
              MATCHON 구독
            </h1>
            {serviceHomeHref ? (
              <Link
                href={serviceHomeHref}
                className="text-sm text-matchon-primary underline"
              >
                서비스로 이동
              </Link>
            ) : null}
          </div>
          <p className="text-sm text-matchon-text-secondary">
            MATCHON 서비스 이용 플랜과 결제 정보를 관리합니다.
          </p>
        </div>

        <section className="space-y-2 rounded-xl border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-semibold">현재 구독</h2>
          {sub ? (
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-matchon-text-secondary">플랜</dt>
                <dd>
                  {sub.plan.name} (
                  {sub.billingInterval === "YEAR" ? "연간" : "월간"})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-matchon-text-secondary">상태</dt>
                <dd className="font-semibold">
                  {subscriptionStatusLabel(sub.status, sub.cancelAtPeriodEnd)}
                </dd>
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
                <dt className="text-matchon-text-secondary">다음 결제일</dt>
                <dd>
                  {sub.cancelAtPeriodEnd
                    ? `${fmt(sub.currentPeriodEnd)} 종료 예정`
                    : fmt(sub.nextBillingAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-matchon-text-secondary">
                  {sub.billingInterval === "YEAR" ? "연 이용료" : "월 이용료"}
                </dt>
                <dd>
                  {sub.cancelAtPeriodEnd ? "-" : formatKrw(sub.currentPrice)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-matchon-text-secondary">결제수단</dt>
                <dd>
                  {method && !method.deletedAt
                    ? `${method.cardCompany ?? "카드"} ****${method.cardLast4 ?? "----"}`
                    : "미등록"}
                </dd>
              </div>
              {sub.cancelAtPeriodEnd && sub.currentPeriodEnd ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                  {fmt(sub.currentPeriodEnd)}에 이용이 종료됩니다.
                </p>
              ) : null}
            </dl>
          ) : (
            <p className="text-matchon-text-secondary">
              활성화된 MATCHON 구독이 없습니다.
            </p>
          )}
          {!sub ||
          sub.status === "PENDING" ||
          sub.status === "EXPIRED" ||
          sub.status === "PAST_DUE" ? (
            <Link
              href="/billing/checkout"
              className="mt-3 inline-flex text-sm font-semibold text-matchon-primary underline"
            >
              플랜 선택하기
            </Link>
          ) : null}

          <BillingAccountActions
            canCancel={Boolean(
              sub &&
                ["ACTIVE", "TRIAL"].includes(sub.status) &&
                !sub.cancelAtPeriodEnd,
            )}
            canChangeMethod={Boolean(
              sub && ["ACTIVE", "TRIAL", "PAST_DUE"].includes(sub.status),
            )}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
          <h2 className="text-sm font-semibold">결제 내역</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-matchon-text-secondary">내역이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-matchon-border text-sm">
              {payments.map((p) => {
                const receiptUrl = receiptUrlFromMetadata(p.metadata);
                const period =
                  p.subscriptionId && sub?.id === p.subscriptionId
                    ? `${fmt(sub.currentPeriodStart)} ~ ${fmt(sub.currentPeriodEnd)}`
                    : null;
                return (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {p.plan.name}{" "}
                        <span className="font-normal text-matchon-text-secondary">
                          {p.plan.interval === "YEAR" ? "연간" : "월간"}
                        </span>
                      </p>
                      <p className="text-xs text-matchon-text-secondary">
                        {fmt(p.paidAt ?? p.createdAt)}
                        {period ? ` · ${period}` : ""}
                        {" · "}
                        {paymentStatusLabel(p.status)}
                        {p.failureCode ? ` (${p.failureCode})` : ""}
                      </p>
                      {receiptUrl ? (
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-matchon-primary underline"
                        >
                          영수증
                        </a>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold">{formatKrw(p.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
