"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AppDateInput } from "@/components/shared/AppDateInput";
import {
  cancelGymManualSaleAction,
  collectGymReceivableAction,
  createGymManualSaleAction,
  createGymReceivableAction,
  createGymRefundAction,
} from "@/features/gym-sales/actions";
import { GymMemberPaymentMethod, GymSalesCategory } from "@/lib/enums";
import { formatWon } from "@/lib/format-won";
import { formatUtcDateOnly } from "@/lib/date-only";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import type { GymSalesDashboard } from "@/lib/services/gym-sales.service";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

type MemberOption = { id: string; name: string };

const PERIODS = [
  { key: "today", label: "오늘" },
  { key: "this_week", label: "이번 주" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난달" },
  { key: "custom", label: "직접 설정" },
] as const;

function PaymentMethodOptions() {
  return (
    <>
      <option value={GymMemberPaymentMethod.card}>카드</option>
      <option value={GymMemberPaymentMethod.cash}>현금</option>
      <option value={GymMemberPaymentMethod.transfer}>계좌이체</option>
      <option value={GymMemberPaymentMethod.easy_pay}>간편결제</option>
      <option value={GymMemberPaymentMethod.other}>기타</option>
    </>
  );
}

function CategoryOptions({ includeEmpty }: { includeEmpty?: boolean }) {
  return (
    <>
      {includeEmpty ? <option value="">미분류</option> : null}
      <option value={GymSalesCategory.membership}>회원권</option>
      <option value={GymSalesCategory.personal_lesson}>개인 레슨</option>
      <option value={GymSalesCategory.group_class}>그룹 수업</option>
      <option value={GymSalesCategory.product}>용품</option>
      <option value={GymSalesCategory.event}>대회</option>
      <option value={GymSalesCategory.other}>기타</option>
    </>
  );
}

export function GymSalesDashboardPanel({
  data,
  members,
  filters,
}: {
  data: GymSalesDashboard;
  members: MemberOption[];
  filters: {
    period: string;
    from?: string;
    to?: string;
    memberNameQ?: string;
    phoneTail?: string;
    paymentMethod?: string;
    status?: string;
    category?: string;
    sort?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = toSeoulDateOnlyString();
  const maxBar = Math.max(1, ...data.daily.map((d) => Math.abs(d.net)));

  function pushQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    router.push(`/gym/sales?${params.toString()}`);
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message?: string } }>,
    okMsg: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={filters.period === p.key ? "default" : "outline"}
            onClick={() => pushQuery({ period: p.key })}
          >
            {p.label}
          </Button>
        ))}
        <Link
          href="/gym/sales/receivables"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          미수금
        </Link>
      </div>

      {filters.period === "custom" ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            pushQuery({
              period: "custom",
              from: String(fd.get("from") ?? ""),
              to: String(fd.get("to") ?? ""),
            });
          }}
        >
          <label className="text-sm">
            시작
            <input
              name="from"
              type="date"
              defaultValue={filters.from ?? today}
              className={cn(matchonFieldInputClass, "mt-1")}
            />
          </label>
          <label className="text-sm">
            종료
            <input
              name="to"
              type="date"
              defaultValue={filters.to ?? today}
              className={cn(matchonFieldInputClass, "mt-1")}
            />
          </label>
          <Button type="submit" size="sm">
            적용
          </Button>
        </form>
      ) : null}

      <div className={matchonStatsGridClass}>
        <div className={matchonStatCardClass}>
          <p className={matchonStatLabelClass}>오늘 매출</p>
          <p className={matchonStatValueClass}>
            {formatWon(data.cards.todayNet)}
          </p>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            결제 {data.cards.todayPaymentCount}건
          </p>
        </div>
        <div className={matchonStatCardClass}>
          <p className={matchonStatLabelClass}>이번 달 순매출</p>
          <p className={matchonStatValueClass}>
            {formatWon(data.cards.monthNet)}
          </p>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            전월 대비 {data.cards.monthMomPct >= 0 ? "+" : ""}
            {data.cards.monthMomPct}%
          </p>
        </div>
        <div className={matchonStatCardClass}>
          <p className={matchonStatLabelClass}>이번 달 환불</p>
          <p className={matchonStatValueClass}>
            {formatWon(data.cards.monthRefund)}
          </p>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            환불 {data.cards.monthRefundCount}건
          </p>
        </div>
        <div className={matchonStatCardClass}>
          <p className={matchonStatLabelClass}>현재 미수금</p>
          <p className={matchonStatValueClass}>
            {formatWon(data.cards.outstandingTotal)}
          </p>
          <p className="mt-1 text-xs text-matchon-text-secondary">
            회원 {data.cards.outstandingMemberCount}명
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryMini
          label="총 결제금액"
          value={formatWon(data.periodSummary.grossPaid)}
        />
        <SummaryMini
          label="할인금액"
          value={formatWon(data.periodSummary.discountTotal)}
        />
        <SummaryMini
          label="결제 건수"
          value={`${data.periodSummary.paymentCount}건`}
        />
        <SummaryMini
          label="결제 회원 수"
          value={`${data.periodSummary.payingMemberCount}명`}
        />
        <SummaryMini
          label="평균 결제금액"
          value={formatWon(data.periodSummary.avgPayment)}
        />
      </div>

      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <h2 className={matchonSectionTitleClass}>일별 순매출</h2>
        <p className="mt-1 text-xs text-matchon-text-secondary">
          {data.period.label} · 순매출 {formatWon(data.periodSummary.netSales)}
        </p>
        <div className="mt-4 flex h-40 items-end gap-1 overflow-x-auto">
          {data.daily.map((d) => {
            const h = Math.round((Math.abs(d.net) / maxBar) * 100);
            const neg = d.net < 0;
            return (
              <div
                key={d.date}
                className="flex min-w-[10px] flex-1 flex-col items-center justify-end"
                title={`${d.date}: 결제 ${formatWon(d.paid)} / 환불 ${formatWon(d.refund)} / 순 ${formatWon(d.net)}`}
              >
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t",
                    neg ? "bg-red-400" : "bg-matchon-primary",
                  )}
                  style={{ height: `${Math.max(h, d.net === 0 ? 2 : 4)}%` }}
                />
              </div>
            );
          })}
        </div>
        <ul className="mt-4 space-y-1 text-sm md:hidden">
          {data.daily
            .filter((d) => d.paid !== 0 || d.refund !== 0)
            .map((d) => (
              <li key={d.date} className="flex justify-between gap-2">
                <span className="text-matchon-text-secondary">
                  {formatUtcDateOnly(d.date)}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    d.net < 0 && "text-red-600",
                  )}
                >
                  {formatWon(d.net)}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-matchon-border bg-white p-4">
          <h2 className={matchonSectionTitleClass}>결제수단별</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.byMethod.length === 0 ? (
              <li className="text-matchon-text-secondary">데이터 없음</li>
            ) : (
              data.byMethod.map((m) => (
                <li key={m.method} className="flex justify-between gap-2">
                  <span>{m.label}</span>
                  <span>
                    {formatWon(m.net)}{" "}
                    <span className="text-matchon-text-secondary">
                      {m.percent}%
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-xl border border-matchon-border bg-white p-4">
          <h2 className={matchonSectionTitleClass}>매출 유형별</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.byCategory.length === 0 ? (
              <li className="text-matchon-text-secondary">데이터 없음</li>
            ) : (
              data.byCategory.map((c) => (
                <li key={c.category} className="flex justify-between gap-2">
                  <span>
                    {c.label}{" "}
                    <span className="text-matchon-text-secondary">
                      {c.count}건
                    </span>
                  </span>
                  <span>
                    {formatWon(c.amount)}{" "}
                    <span className="text-matchon-text-secondary">
                      {c.percent}%
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <h2 className={matchonSectionTitleClass}>수기 매출 등록</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          action={(fd) =>
            run(
              () => createGymManualSaleAction(fd),
              "수기 매출을 등록했습니다.",
            )
          }
        >
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>항목명 *</span>
            <input name="title" required className={matchonFieldInputClass} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>금액 *</span>
            <input
              name="amount"
              inputMode="numeric"
              required
              className={matchonFieldInputClass}
            />
          </label>
          <AppDateInput name="soldAt" label="매출일" defaultValue={today} />
          <label className="block space-y-1 text-sm">
            <span>결제수단</span>
            <select
              name="paymentMethod"
              className={matchonFieldInputClass}
              defaultValue={GymMemberPaymentMethod.cash}
            >
              <PaymentMethodOptions />
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>매출 유형</span>
            <select
              name="category"
              className={matchonFieldInputClass}
              defaultValue={GymSalesCategory.other}
            >
              <CategoryOptions />
            </select>
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>회원 연결 (선택)</span>
            <select name="gymMemberId" className={matchonFieldInputClass} defaultValue="">
              <option value="">없음</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>메모</span>
            <input name="memo" className={matchonFieldInputClass} />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              수기 매출 등록
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={matchonSectionTitleClass}>결제 내역</h2>
        </div>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            pushQuery({
              memberNameQ: String(fd.get("memberNameQ") ?? "") || undefined,
              phoneTail: String(fd.get("phoneTail") ?? "") || undefined,
              paymentMethod: String(fd.get("paymentMethod") ?? "") || undefined,
              status: String(fd.get("status") ?? "") || undefined,
              category: String(fd.get("category") ?? "") || undefined,
              sort: String(fd.get("sort") ?? "") || undefined,
            });
          }}
        >
          <input
            name="memberNameQ"
            placeholder="회원명"
            defaultValue={filters.memberNameQ}
            className={matchonFieldInputClass}
          />
          <input
            name="phoneTail"
            placeholder="전화 끝 4자리"
            defaultValue={filters.phoneTail}
            className={matchonFieldInputClass}
          />
          <select
            name="paymentMethod"
            defaultValue={filters.paymentMethod ?? ""}
            className={matchonFieldInputClass}
          >
            <option value="">결제수단 전체</option>
            <PaymentMethodOptions />
          </select>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className={matchonFieldInputClass}
          >
            <option value="">상태 전체</option>
            <option value="paid">완료</option>
            <option value="cancelled">취소</option>
            <option value="refunded">환불 완료</option>
          </select>
          <select
            name="category"
            defaultValue={filters.category ?? ""}
            className={matchonFieldInputClass}
          >
            <option value="">유형 전체</option>
            <option value="unclassified">미분류</option>
            <CategoryOptions />
          </select>
          <select
            name="sort"
            defaultValue={filters.sort ?? "recent"}
            className={matchonFieldInputClass}
          >
            <option value="recent">최근 결제순</option>
            <option value="amount_desc">금액 높은 순</option>
            <option value="amount_asc">금액 낮은 순</option>
          </select>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm">
              필터
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                pushQuery({
                  memberNameQ: undefined,
                  phoneTail: undefined,
                  paymentMethod: undefined,
                  status: undefined,
                  category: undefined,
                  sort: "recent",
                })
              }
            >
              초기화
            </Button>
          </div>
        </form>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="text-xs text-matchon-text-secondary">
              <tr>
                <th className="py-2 pr-2">결제일</th>
                <th className="py-2 pr-2">회원</th>
                <th className="py-2 pr-2">항목</th>
                <th className="py-2 pr-2">결제</th>
                <th className="py-2 pr-2">할인</th>
                <th className="py-2 pr-2">환불</th>
                <th className="py-2 pr-2">순매출</th>
                <th className="py-2 pr-2">수단</th>
                <th className="py-2 pr-2">상태</th>
                <th className="py-2">환불</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={`${t.source}-${t.id}`} className="border-t border-matchon-border">
                  <td className="py-2 pr-2">{formatUtcDateOnly(t.paidAt)}</td>
                  <td className="py-2 pr-2">
                    <div>{t.memberName ?? "—"}</div>
                    <div className="text-xs text-matchon-text-secondary">
                      {t.maskedPhone ?? ""}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    {t.title}
                    <div className="text-xs text-matchon-text-secondary">
                      {t.categoryLabel} · {t.source === "MANUAL_SALE" ? "수기" : "회원"}
                    </div>
                  </td>
                  <td className="py-2 pr-2">{formatWon(t.amount)}</td>
                  <td className="py-2 pr-2">{formatWon(t.discountAmount)}</td>
                  <td className="py-2 pr-2">{formatWon(t.refundAmount)}</td>
                  <td className="py-2 pr-2">{formatWon(t.net)}</td>
                  <td className="py-2 pr-2">{t.paymentMethodLabel}</td>
                  <td className="py-2 pr-2">{t.status}</td>
                  <td className="py-2">
                    {t.status === "paid" || t.status === "refunded" ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-matchon-primary">
                          환불
                        </summary>
                        <form
                          className="mt-2 space-y-1 rounded border border-matchon-border p-2"
                          action={(fd) =>
                            run(
                              () => createGymRefundAction(fd),
                              "환불을 등록했습니다.",
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t.source === "MEMBER_PAYMENT" ? (
                            <input type="hidden" name="paymentId" value={t.id} />
                          ) : (
                            <input type="hidden" name="manualSaleId" value={t.id} />
                          )}
                          <input
                            name="amount"
                            inputMode="numeric"
                            required
                            placeholder="환불금액"
                            className={matchonFieldInputClass}
                          />
                          <AppDateInput
                            name="refundedAt"
                            label="환불일"
                            defaultValue={today}
                          />
                          <select
                            name="refundMethod"
                            className={matchonFieldInputClass}
                            defaultValue={t.paymentMethod}
                          >
                            <PaymentMethodOptions />
                          </select>
                          <input
                            name="reason"
                            placeholder="사유"
                            className={matchonFieldInputClass}
                          />
                          <Button type="submit" size="xs" disabled={pending}>
                            환불 처리
                          </Button>
                        </form>
                      </details>
                    ) : null}
                    {t.source === "MANUAL_SALE" && t.status === "paid" ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="mt-1"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("수기 매출을 취소하시겠습니까?")) {
                            return;
                          }
                          run(
                            () => cancelGymManualSaleAction(t.id),
                            "수기 매출을 취소했습니다.",
                          );
                        }}
                      >
                        취소
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-4 space-y-3 md:hidden">
          {data.transactions.map((t) => (
            <li
              key={`m-${t.source}-${t.id}`}
              className="rounded-lg border border-matchon-border p-3 text-sm"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{t.memberName ?? t.title}</span>
                <span>{formatWon(t.net)}</span>
              </div>
              <p className="mt-1 text-xs text-matchon-text-secondary">
                {formatUtcDateOnly(t.paidAt)} · {t.paymentMethodLabel} ·{" "}
                {t.status}
              </p>
              <p className="text-xs text-matchon-text-secondary">
                {t.title} · 결제 {formatWon(t.amount)}
                {t.refundAmount > 0 ? ` · 환불 ${formatWon(t.refundAmount)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-matchon-text-secondary">{data.disclaimer}</p>
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-matchon-border bg-white px-3 py-2">
      <p className="text-xs text-matchon-text-secondary">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function GymReceivablesPanel({
  rows,
  members,
}: {
  rows: Array<{
    id: string;
    memberId: string;
    memberName: string;
    maskedPhone: string;
    title: string;
    totalAmount: number;
    paidAmount: number;
    remaining: number;
    dueDate: Date | null;
    overdueDays: number;
    status: string;
    categoryLabel: string;
  }>;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = toSeoulDateOnlyString();

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message?: string } }>,
    okMsg: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(okMsg);
      router.refresh();
    });
  }

  const statusLabel: Record<string, string> = {
    pending: "납부 예정",
    partial: "일부 납부",
    overdue: "연체",
    paid: "완납",
    cancelled: "취소",
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      <section className="rounded-xl border border-matchon-border bg-white p-4">
        <h2 className={matchonSectionTitleClass}>미수금 등록</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          action={(fd) =>
            run(
              () => createGymReceivableAction(fd),
              "미수금을 등록했습니다.",
            )
          }
        >
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>회원 *</span>
            <select name="gymMemberId" required className={matchonFieldInputClass}>
              <option value="">선택</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>결제 항목 *</span>
            <input name="title" required className={matchonFieldInputClass} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>청구금액 *</span>
            <input
              name="totalAmount"
              inputMode="numeric"
              required
              className={matchonFieldInputClass}
            />
          </label>
          <AppDateInput name="dueDate" label="납부기한" />
          <label className="block space-y-1 text-sm">
            <span>유형</span>
            <select name="category" className={matchonFieldInputClass} defaultValue="">
              <CategoryOptions includeEmpty />
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              미수금 등록
            </Button>
          </div>
        </form>
      </section>

      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-matchon-text-secondary">
            미수금이 없습니다.
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-matchon-border bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.memberName}{" "}
                    <span className="text-xs text-matchon-text-secondary">
                      {r.maskedPhone}
                    </span>
                  </p>
                  <p className="text-sm text-matchon-text-secondary">
                    {r.title} · {r.categoryLabel}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {statusLabel[r.status] ?? r.status}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-matchon-text-secondary">청구</p>
                  <p>{formatWon(r.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-matchon-text-secondary">납부</p>
                  <p>{formatWon(r.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-matchon-text-secondary">남은 금액</p>
                  <p>{formatWon(r.remaining)}</p>
                </div>
                <div>
                  <p className="text-xs text-matchon-text-secondary">납부기한</p>
                  <p>
                    {r.dueDate ? formatUtcDateOnly(r.dueDate) : "—"}
                    {r.overdueDays > 0 ? ` · ${r.overdueDays}일 경과` : ""}
                  </p>
                </div>
              </div>
              {r.remaining > 0 && r.status !== "cancelled" ? (
                <form
                  className="mt-3 grid gap-2 border-t border-matchon-border pt-3 sm:grid-cols-4"
                  action={(fd) =>
                    run(
                      () => collectGymReceivableAction(r.id, fd),
                      "납부를 등록했습니다.",
                    )
                  }
                >
                  <input
                    name="amount"
                    inputMode="numeric"
                    required
                    placeholder={`납부금액 (최대 ${r.remaining})`}
                    className={matchonFieldInputClass}
                  />
                  <AppDateInput name="paidAt" label="결제일" defaultValue={today} />
                  <select
                    name="paymentMethod"
                    className={matchonFieldInputClass}
                    defaultValue={GymMemberPaymentMethod.cash}
                  >
                    <PaymentMethodOptions />
                  </select>
                  <Button type="submit" size="sm" disabled={pending}>
                    결제 받기
                  </Button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
