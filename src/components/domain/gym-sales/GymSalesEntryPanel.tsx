"use client";

import { useMemo, useState, useTransition } from "react";
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
  SalesEntryModal,
  type SalesEntryMemberOption,
  type SalesEntryProductOption,
} from "@/components/domain/gym-sales/SalesEntryModal";
import {
  cancelGymManualSaleAction,
  cancelGymReceivableAction,
  collectGymReceivableAction,
} from "@/features/gym-sales/actions";
import { GymMemberPaymentMethod } from "@/lib/enums";
import { formatWon } from "@/lib/format-won";
import { formatUtcDateOnly } from "@/lib/date-only";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type SalesEntryRow = {
  id: string;
  kind: "manual_sale" | "receivable";
  soldAt: Date | string;
  memberId: string | null;
  memberName: string | null;
  maskedPhone: string | null;
  title: string;
  categoryLabel: string;
  productName: string | null;
  saleAmount: number;
  paidAmount: number;
  remaining: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paymentStatusLabel: string;
  overdueDays: number;
};

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "paid", label: "결제 완료" },
  { key: "partial", label: "일부 결제" },
  { key: "unpaid", label: "미수" },
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

export function GymSalesEntryPanel({
  rows,
  members,
  products,
  initialFilter = "all",
}: {
  rows: SalesEntryRow[];
  members: SalesEntryMemberOption[];
  products: SalesEntryProductOption[];
  initialFilter?: "all" | "paid" | "partial" | "unpaid";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  const [entryOpen, setEntryOpen] = useState(false);
  const [collectTarget, setCollectTarget] = useState<SalesEntryRow | null>(
    null,
  );
  const today = toSeoulDateOnlyString();

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.paymentStatus === filter);
  }, [rows, filter]);

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
      setCollectTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
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
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          onClick={() => setEntryOpen(true)}
        >
          + 매출 등록
        </Button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="text-xs text-matchon-text-secondary">
            <tr>
              <th className="py-2 pr-2">날짜</th>
              <th className="py-2 pr-2">회원</th>
              <th className="py-2 pr-2">항목</th>
              <th className="py-2 pr-2">구분</th>
              <th className="py-2 pr-2">판매금액</th>
              <th className="py-2 pr-2">결제금액</th>
              <th className="py-2 pr-2">미수금</th>
              <th className="py-2 pr-2">상태</th>
              <th className="py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-matchon-text-secondary"
                >
                  등록된 매출이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-matchon-border">
                  <td className="py-2 pr-2">{formatUtcDateOnly(r.soldAt)}</td>
                  <td className="py-2 pr-2">
                    <div>{r.memberName ?? "일반 판매"}</div>
                    <div className="text-xs text-matchon-text-secondary">
                      {r.maskedPhone ?? ""}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    {r.title}
                    {r.productName ? (
                      <div className="text-xs text-matchon-text-secondary">
                        상품 · {r.productName}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2">{r.categoryLabel}</td>
                  <td className="py-2 pr-2">{formatWon(r.saleAmount)}</td>
                  <td className="py-2 pr-2">{formatWon(r.paidAmount)}</td>
                  <td className="py-2 pr-2">{formatWon(r.remaining)}</td>
                  <td className="py-2 pr-2">
                    {r.paymentStatusLabel}
                    {r.overdueDays > 0 ? (
                      <div className="text-xs text-amber-700">
                        {r.overdueDays}일 경과
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.kind === "receivable" && r.remaining > 0 ? (
                        <Button
                          type="button"
                          size="xs"
                          disabled={pending}
                          onClick={() => setCollectTarget(r)}
                        >
                          수납
                        </Button>
                      ) : null}
                      {r.kind === "receivable" && r.remaining > 0 ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm("이 미수 거래를 취소할까요?")) {
                              return;
                            }
                            run(
                              () => cancelGymReceivableAction(r.id),
                              "미수 거래를 취소했습니다.",
                            );
                          }}
                        >
                          취소
                        </Button>
                      ) : null}
                      {r.kind === "manual_sale" ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm("이 매출을 취소할까요?")) {
                              return;
                            }
                            run(
                              () => cancelGymManualSaleAction(r.id),
                              "매출을 취소했습니다.",
                            );
                          }}
                        >
                          취소
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <li className="text-sm text-matchon-text-secondary">
            등록된 매출이 없습니다.
          </li>
        ) : (
          filtered.map((r) => (
            <li
              key={`m-${r.kind}-${r.id}`}
              className="rounded-xl border border-matchon-border bg-white p-3 text-sm"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-matchon-text-secondary">
                    {r.memberName ?? "일반 판매"} · {formatUtcDateOnly(r.soldAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    r.paymentStatus === "paid"
                      ? "text-emerald-700"
                      : "text-amber-700",
                  )}
                >
                  {r.paymentStatusLabel}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-matchon-text-secondary">판매</p>
                  <p>{formatWon(r.saleAmount)}</p>
                </div>
                <div>
                  <p className="text-matchon-text-secondary">결제</p>
                  <p>{formatWon(r.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-matchon-text-secondary">미수</p>
                  <p>{formatWon(r.remaining)}</p>
                </div>
              </div>
              {r.kind === "receivable" && r.remaining > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={pending}
                  onClick={() => setCollectTarget(r)}
                >
                  수납
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <SalesEntryModal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        members={members}
        products={products}
      />

      <Dialog
        open={!!collectTarget}
        onOpenChange={(open) => {
          if (!open) setCollectTarget(null);
        }}
      >
        <DialogContent
          className={cn(
            "max-w-md gap-0 p-0 sm:max-w-md",
            "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl",
          )}
        >
          <DialogHeader className="border-b border-matchon-border px-4 py-4">
            <DialogTitle>미수 수납</DialogTitle>
            <DialogDescription>
              {collectTarget?.title} · 남은 미수{" "}
              {formatWon(collectTarget?.remaining ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {collectTarget ? (
            <form
              className="space-y-3 px-4 py-4"
              action={(fd) =>
                run(
                  () => collectGymReceivableAction(collectTarget.id, fd),
                  "수납을 등록했습니다.",
                )
              }
            >
              <div className="rounded-lg border border-matchon-border px-3 py-2 text-sm">
                <span className="text-matchon-text-secondary">남은 미수금 </span>
                <span className="font-semibold">
                  {formatWon(collectTarget.remaining)}
                </span>
              </div>
              <label className="block space-y-1 text-sm">
                <span>이번 수납금액 *</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  required
                  placeholder={`최대 ${collectTarget.remaining}`}
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
              <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCollectTarget(null)}
                >
                  닫기
                </Button>
                <Button type="submit" disabled={pending}>
                  수납
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
