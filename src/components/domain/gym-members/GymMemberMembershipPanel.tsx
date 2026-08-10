"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelGymMemberSubscriptionAction,
  collectGymMemberReceivableAction,
  correctGymMemberSubscriptionAction,
  extendGymMemberSubscriptionAction,
  refundGymMemberPaymentAction,
  sellGymMembershipAction,
} from "@/features/gym-members/actions";
import { GymMemberPaymentMethod, GymMembershipDurationType, GymMemberSubscriptionStatus } from "@/lib/enums";
import { addMembershipDuration } from "@/lib/gym-member/membership-duration";
import {
  formatUtcDateOnly,
  toDateInputValue,
  todayUtcDateOnlyString,
} from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";
import type {
  MembershipTimelineItem,
  SubscriptionHistoryVM,
} from "@/lib/services/gym-membership-sale.service";

type PlanOption = {
  id: string;
  name: string;
  price: number;
  durationType: GymMembershipDurationType;
  durationValue: number | null;
};

type MoneySummary = {
  listPrice: number;
  discountAmount: number;
  saleAmount: number;
  paidAmount: number;
  refundTotal: number;
  outstanding: number;
  primaryReceivableId: string | null;
  primaryPaymentId: string | null;
};

type CurrentSub = {
  id: string;
  planId: string | null;
  planNameSnapshot: string;
  status: string;
  startedAt: Date | string;
  endsAt: Date | string | null;
  priceSnapshot: number;
  memo: string | null;
};

type ModalKind =
  | "sale"
  | "renew"
  | "extend"
  | "correct"
  | "refund"
  | "collect"
  | "more"
  | null;

function sheetClass() {
  return cn(
    "max-h-[92vh] w-full max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg",
    "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl",
  );
}

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

function nextDayYmd(endsAt: Date | string | null): string {
  if (!endsAt) return todayUtcDateOnlyString();
  const d = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  );
  return formatUtcDateOnly(next, "-");
}

function toYmd(d: Date | null): string {
  if (!d) return "";
  return formatUtcDateOnly(d, "-");
}

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  [GymMemberSubscriptionStatus.active]: "이용중",
  [GymMemberSubscriptionStatus.paused]: "휴회",
  [GymMemberSubscriptionStatus.ended]: "종료",
  [GymMemberSubscriptionStatus.cancelled]: "취소",
};

function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABEL[status] ?? status;
}

function periodOrSessionsText(
  periodText: string | null,
  usedSessionsText: string | null,
): string {
  const parts = [periodText, usedSessionsText].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function formatDateRange(
  startedAt: Date | string,
  endsAt: Date | string | null,
): string {
  const start = formatUtcDateOnly(startedAt);
  if (!endsAt) return start;
  return `${start} ~ ${formatUtcDateOnly(endsAt)}`;
}

export function GymMemberMembershipPanel({
  memberId,
  plans,
  currentSubscription,
  money,
  timeline,
  subscriptionHistory,
  statusLabel,
}: {
  memberId: string;
  plans: PlanOption[];
  currentSubscription: CurrentSub | null;
  money: MoneySummary | null;
  timeline: MembershipTimelineItem[];
  subscriptionHistory: SubscriptionHistoryVM;
  statusLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const today = todayUtcDateOnlyString();

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
      setModal(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <section className="rounded-[10px] border border-matchon-border bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className={cn(matchonSectionTitleClass, "text-sm")}>
              현재 이용권
            </h2>
            {currentSubscription ? (
              <>
                <p className="text-xs text-matchon-text-primary">
                  <span className="font-semibold text-matchon-primary">
                    {statusLabel}
                  </span>
                  <span className="text-matchon-text-secondary"> | </span>
                  <span className="font-medium">
                    {currentSubscription.planNameSnapshot}
                  </span>
                  <span className="text-matchon-text-secondary"> | </span>
                  <span className="text-matchon-text-secondary">
                    {formatDateRange(
                      currentSubscription.startedAt,
                      currentSubscription.endsAt,
                    )}
                  </span>
                </p>
                {money ? (
                  <p className="text-xs text-matchon-text-secondary">
                    <span className="font-medium text-matchon-text-primary">
                      {formatWon(money.paidAmount)}
                    </span>
                    <span> | 미수 </span>
                    <span
                      className={cn(
                        "font-medium",
                        money.outstanding > 0
                          ? "text-amber-700"
                          : "text-matchon-text-primary",
                      )}
                    >
                      {formatWon(money.outstanding)}
                    </span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-matchon-text-secondary">
                배정된 이용권이 없습니다.
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setModal("sale")}
          >
            이용권·결제 등록
          </Button>
        </div>

        {currentSubscription ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-matchon-border pt-2.5">
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={pending}
              onClick={() => setModal("renew")}
            >
              재등록
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              disabled={pending}
              onClick={() => setModal("extend")}
            >
              연기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="hidden h-7 px-2.5 text-xs sm:inline-flex"
              disabled={pending}
              onClick={() => setModal("correct")}
            >
              정정
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="hidden h-7 px-2.5 text-xs sm:inline-flex"
              disabled={pending || !money?.primaryPaymentId}
              onClick={() => setModal("refund")}
            >
              환불
            </Button>
            {money && money.outstanding > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={pending || !money.primaryReceivableId}
                onClick={() => setModal("collect")}
              >
                추가 수납
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => setModal("more")}
            >
              더보기
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[10px] border border-matchon-border bg-white p-3">
        <h2
          className={cn(matchonSectionTitleClass, "mb-2 text-sm")}
          title="재등록 횟수는 MATCHON에서 처리한 내역부터 집계됩니다."
        >
          이용권 이력 {subscriptionHistory.totalCount}건 · 재등록{" "}
          {subscriptionHistory.matchonRenewalCount}회
        </h2>
        {subscriptionHistory.rows.length === 0 ? (
          <p className="text-xs text-matchon-text-secondary">
            이용권 이력이 없습니다.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] table-fixed text-left text-xs">
                <thead className="border-b border-matchon-border text-[10px] font-semibold text-matchon-text-secondary">
                  <tr>
                    <th scope="col" className="w-8 px-1.5 py-1.5 text-center">
                      #
                    </th>
                    <th scope="col" className="w-[9%] px-1.5 py-1.5">
                      상태
                    </th>
                    <th scope="col" className="w-[11%] px-1.5 py-1.5">
                      구분
                    </th>
                    <th scope="col" className="w-[16%] px-1.5 py-1.5">
                      회원권
                    </th>
                    <th
                      scope="col"
                      className="hidden w-[10%] px-1.5 py-1.5 lg:table-cell"
                    >
                      거래일
                    </th>
                    <th scope="col" className="w-[10%] px-1.5 py-1.5">
                      시작일
                    </th>
                    <th scope="col" className="w-[10%] px-1.5 py-1.5">
                      종료일
                    </th>
                    <th
                      scope="col"
                      className="hidden w-[12%] px-1.5 py-1.5 xl:table-cell"
                    >
                      기간/횟수
                    </th>
                    <th scope="col" className="w-[11%] px-1.5 py-1.5 text-right">
                      결제금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionHistory.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-matchon-border last:border-0"
                    >
                      <td className="px-1.5 py-1 text-center tabular-nums text-matchon-text-secondary">
                        {row.sequence}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {subscriptionStatusLabel(row.status)}
                      </td>
                      <td className="px-1.5 py-1">
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <span className="break-words">{row.sourceLabel}</span>
                          {row.isImport ? (
                            <span className="rounded bg-matchon-surface px-1 py-0.5 text-[10px] font-medium text-matchon-text-secondary">
                              가져오기
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 break-words">
                        {row.planName}
                      </td>
                      <td className="hidden px-1.5 py-1 whitespace-nowrap lg:table-cell">
                        {row.paidAt ? formatUtcDateOnly(row.paidAt) : "—"}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {formatUtcDateOnly(row.startedAt)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {row.endsAt ? formatUtcDateOnly(row.endsAt) : "—"}
                      </td>
                      <td className="hidden px-1.5 py-1 xl:table-cell">
                        {periodOrSessionsText(
                          row.periodText,
                          row.usedSessionsText,
                        )}
                      </td>
                      <td className="px-1.5 py-1 text-right font-medium tabular-nums">
                        {formatWon(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {subscriptionHistory.rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-matchon-border px-2.5 py-2"
                >
                  <p className="text-xs font-medium text-matchon-text-primary">
                    #{row.sequence} · {row.sourceLabel} ·{" "}
                    {subscriptionStatusLabel(row.status)}
                    {row.isImport ? (
                      <span className="ml-1 rounded bg-matchon-surface px-1 py-0.5 text-[10px] font-normal text-matchon-text-secondary">
                        가져오기
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-matchon-text-primary">
                    {row.planName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-matchon-text-secondary">
                    {formatDateRange(row.startedAt, row.endsAt)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-matchon-text-primary">
                    {formatWon(row.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-[10px] border border-matchon-border bg-matchon-surface/40 p-3">
        <h2 className={cn(matchonSectionTitleClass, "mb-2 text-xs")}>
          처리 이력
        </h2>
        {timeline.length === 0 ? (
          <p className="text-xs text-matchon-text-secondary">
            처리 이력이 없습니다.
          </p>
        ) : (
          <ol className="relative space-y-2 border-l border-matchon-border pl-3">
            {timeline.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[1.15rem] top-1 size-1.5 rounded-full bg-matchon-primary/70" />
                <p className="text-xs font-medium text-matchon-text-primary">
                  {item.title}
                </p>
                <p className="text-[11px] text-matchon-text-secondary">
                  {formatUtcDateOnly(item.at)}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <MembershipSaleDialog
        open={modal === "sale" || modal === "renew"}
        mode={modal === "renew" ? "renew" : "sell"}
        memberId={memberId}
        plans={plans}
        current={currentSubscription}
        pending={pending}
        onClose={() => setModal(null)}
        onSubmit={(fd) =>
          run(
            () => sellGymMembershipAction(memberId, fd),
            modal === "renew"
              ? "재등록을 완료했습니다."
              : "이용권·결제를 등록했습니다.",
          )
        }
      />

      <Dialog open={modal === "extend"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className={sheetClass()}>
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>연기</DialogTitle>
            <DialogDescription>
              현재 종료일{" "}
              {currentSubscription?.endsAt
                ? formatUtcDateOnly(currentSubscription.endsAt)
                : "—"}
            </DialogDescription>
          </DialogHeader>
          {currentSubscription ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) =>
                run(
                  () =>
                    extendGymMemberSubscriptionAction(
                      memberId,
                      currentSubscription.id,
                      fd,
                    ),
                  "이용권을 연기했습니다.",
                )
              }
            >
              <label className="block space-y-1 text-sm">
                <span>연기 일수 *</span>
                <input
                  name="extendDays"
                  inputMode="numeric"
                  required
                  defaultValue={7}
                  className={matchonFieldInputClass}
                />
              </label>
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
                <Button type="button" variant="outline" onClick={() => setModal(null)}>
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  저장
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "correct"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className={sheetClass()}>
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>정정</DialogTitle>
            <DialogDescription>시작일·종료일을 수정합니다.</DialogDescription>
          </DialogHeader>
          {currentSubscription ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) =>
                run(
                  () =>
                    correctGymMemberSubscriptionAction(
                      memberId,
                      currentSubscription.id,
                      fd,
                    ),
                  "이용권을 정정했습니다.",
                )
              }
            >
              <AppDateInput
                name="startedAt"
                label="시작일"
                defaultValue={toDateInputValue(currentSubscription.startedAt)}
              />
              <AppDateInput
                name="endsAt"
                label="종료일"
                defaultValue={toDateInputValue(currentSubscription.endsAt)}
              />
              <label className="block space-y-1 text-sm">
                <span>메모</span>
                <input
                  name="memo"
                  defaultValue={currentSubscription.memo ?? ""}
                  className={matchonFieldInputClass}
                />
              </label>
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
                <Button type="button" variant="outline" onClick={() => setModal(null)}>
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  저장
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "collect"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className={sheetClass()}>
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>추가 수납</DialogTitle>
            <DialogDescription>
              남은 미수 {formatWon(money?.outstanding ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {money?.primaryReceivableId ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) =>
                run(
                  () =>
                    collectGymMemberReceivableAction(
                      memberId,
                      money.primaryReceivableId!,
                      fd,
                    ),
                  "수납을 등록했습니다.",
                )
              }
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <MoneyCell label="판매금액" value={formatWon(money.saleAmount)} />
                <MoneyCell label="기존 수납" value={formatWon(money.paidAmount)} />
              </div>
              <label className="block space-y-1 text-sm">
                <span>이번 수납액 *</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  required
                  placeholder={`최대 ${money.outstanding}`}
                  className={matchonFieldInputClass}
                />
              </label>
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
              <AppDateInput name="paidAt" label="수납일" defaultValue={today} />
              <label className="block space-y-1 text-sm">
                <span>메모</span>
                <input name="memo" className={matchonFieldInputClass} />
              </label>
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
                <Button type="button" variant="outline" onClick={() => setModal(null)}>
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  수납
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "refund"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className={sheetClass()}>
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>환불</DialogTitle>
            <DialogDescription>
              환불금액은 직접 입력합니다. 자동 계산하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          {money?.primaryPaymentId ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) =>
                run(
                  () => refundGymMemberPaymentAction(memberId, fd),
                  "환불을 등록했습니다.",
                )
              }
            >
              <input type="hidden" name="paymentId" value={money.primaryPaymentId} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <MoneyCell label="정상가" value={formatWon(money.listPrice)} />
                <MoneyCell label="할인" value={formatWon(money.discountAmount)} />
                <MoneyCell label="결제" value={formatWon(money.paidAmount)} />
                <MoneyCell label="기존 환불" value={formatWon(money.refundTotal)} />
              </div>
              <label className="block space-y-1 text-sm">
                <span>환불금액 *</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  required
                  className={matchonFieldInputClass}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>환불수단</span>
                <select
                  name="refundMethod"
                  className={matchonFieldInputClass}
                  defaultValue={GymMemberPaymentMethod.cash}
                >
                  <PaymentMethodOptions />
                </select>
              </label>
              <AppDateInput
                name="refundedAt"
                label="환불일"
                defaultValue={today}
              />
              <label className="block space-y-1 text-sm">
                <span>환불사유</span>
                <input name="reason" className={matchonFieldInputClass} />
              </label>
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
                <Button type="button" variant="outline" onClick={() => setModal(null)}>
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  환불
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "more"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className={sheetClass()}>
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>더보기</DialogTitle>
            <DialogDescription>추가 작업</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-4 py-4">
            <Button
              type="button"
              variant="outline"
              className="justify-start sm:hidden"
              onClick={() => setModal("correct")}
            >
              정정
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start sm:hidden"
              disabled={!money?.primaryPaymentId}
              onClick={() => setModal("refund")}
            >
              환불
            </Button>
            <p className="text-xs text-matchon-text-secondary">
              양도는 현재 도메인에 지원되지 않습니다. (별도 설계 후 추가)
            </p>
            <Button
              type="button"
              variant="destructive"
              className="justify-start"
              disabled={pending || !currentSubscription}
              onClick={() => {
                if (
                  !currentSubscription ||
                  !window.confirm("이 이용권을 취소하시겠습니까?")
                ) {
                  return;
                }
                run(
                  () =>
                    cancelGymMemberSubscriptionAction(
                      memberId,
                      currentSubscription.id,
                    ),
                  "이용권을 취소했습니다.",
                );
              }}
            >
              이용권 취소
            </Button>
            <Button type="button" variant="outline" onClick={() => setModal(null)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoneyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-matchon-border px-3 py-2">
      <p className="text-xs text-matchon-text-secondary">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function MembershipSaleDialog({
  open,
  mode,
  memberId: _memberId,
  plans,
  current,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "sell" | "renew";
  memberId: string;
  plans: PlanOption[];
  current: CurrentSub | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const defaultPlanId =
    mode === "renew" && current?.planId
      ? current.planId
      : (plans[0]?.id ?? "");
  const defaultStart =
    mode === "renew" ? nextDayYmd(current?.endsAt ?? null) : todayUtcDateOnlyString();

  const [planId, setPlanId] = useState(defaultPlanId);
  const [startedAt, setStartedAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("");

  // reset when opening
  useEffect(() => {
    if (!open) return;
    const plan = plans.find((p) => p.id === defaultPlanId) ?? plans[0];
    setPlanId(plan?.id ?? "");
    setStartedAt(defaultStart);
    if (plan) {
      setListPrice(String(plan.price));
      setPaidAmount(String(plan.price));
      const start = new Date(`${defaultStart}T00:00:00.000Z`);
      const ends = addMembershipDuration(
        start,
        plan.durationType,
        plan.durationValue,
      );
      setEndsAt(toYmd(ends));
    } else {
      setListPrice("");
      setPaidAmount("");
      setEndsAt("");
    }
    setDiscountAmount("0");
  }, [open, defaultPlanId, defaultStart, plans]);

  const saleAmount = Math.max(
    0,
    (Number(listPrice) || 0) - (Number(discountAmount) || 0),
  );
  const outstanding = Math.max(0, saleAmount - (Number(paidAmount) || 0));

  function applyPlan(nextPlanId: string, start: string) {
    setPlanId(nextPlanId);
    const plan = plans.find((p) => p.id === nextPlanId);
    if (!plan) return;
    setListPrice(String(plan.price));
    setPaidAmount(String(plan.price));
    const s = start ? new Date(`${start}T00:00:00.000Z`) : null;
    if (!s || Number.isNaN(s.getTime())) return;
    setEndsAt(toYmd(addMembershipDuration(s, plan.durationType, plan.durationValue)));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={sheetClass()}>
        <DialogHeader className="border-b border-matchon-border px-4 py-4">
          <DialogTitle>
            {mode === "renew" ? "재등록" : "이용권·결제 등록"}
          </DialogTitle>
          <DialogDescription>
            이용권·할인·결제·미수를 한 번에 저장합니다.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3 px-4 py-4">
          <input type="hidden" name="op" value={mode === "renew" ? "renew" : "sell"} />
          <label className="block space-y-1 text-sm">
            <span>이용권 *</span>
            <select
              name="planId"
              required
              className={matchonFieldInputClass}
              value={planId}
              onChange={(e) => applyPlan(e.target.value, startedAt)}
            >
              <option value="" disabled>
                선택
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatWon(p.price)})
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <AppDateInput
              name="startedAt"
              label="시작일"
              value={startedAt}
              onValueChange={(v) => {
                setStartedAt(v);
                if (planId) applyPlan(planId, v);
              }}
            />
            <AppDateInput
              name="endsAt"
              label="종료일"
              value={endsAt}
              onValueChange={setEndsAt}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>정상가 *</span>
              <input
                name="listPrice"
                inputMode="numeric"
                required
                value={listPrice}
                onChange={(e) => {
                  setListPrice(e.target.value);
                  if (!discountAmount || discountAmount === "0") {
                    setPaidAmount(e.target.value);
                  }
                }}
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>할인금액</span>
              <input
                name="discountAmount"
                inputMode="numeric"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className={matchonFieldInputClass}
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>할인사유</span>
            <input name="discountReason" className={matchonFieldInputClass} />
          </label>
          <div className="rounded-lg border border-matchon-border bg-matchon-bg-muted/40 px-3 py-2 text-sm">
            최종 판매금액{" "}
            <span className="font-semibold">{formatWon(saleAmount)}</span>
          </div>
          <label className="block space-y-1 text-sm">
            <span>실제 결제금액 *</span>
            <input
              name="paidAmount"
              inputMode="numeric"
              required
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className={matchonFieldInputClass}
            />
          </label>
          <div className="rounded-lg border border-matchon-border px-3 py-2 text-sm">
            미수금 <span className="font-semibold">{formatWon(outstanding)}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <AppDateInput
              name="paidAt"
              label="결제일"
              defaultValue={todayUtcDateOnlyString()}
            />
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
          </div>
          <label className="block space-y-1 text-sm">
            <span>메모</span>
            <input name="memo" className={matchonFieldInputClass} />
          </label>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={pending || plans.length === 0}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
