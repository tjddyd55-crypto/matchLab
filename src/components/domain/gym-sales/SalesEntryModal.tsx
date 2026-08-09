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
import { createGymSalesEntryAction } from "@/features/gym-sales/actions";
import { GymMemberPaymentMethod, GymSalesCategory } from "@/lib/enums";
import { formatWon } from "@/lib/format-won";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type SalesEntryMemberOption = { id: string; name: string };
export type SalesEntryProductOption = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  defaultPrice: number;
};

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

function CategoryOptions() {
  return (
    <>
      <option value={GymSalesCategory.membership}>회원권</option>
      <option value={GymSalesCategory.personal_lesson}>개인 레슨</option>
      <option value={GymSalesCategory.group_class}>그룹 수업</option>
      <option value={GymSalesCategory.product}>용품</option>
      <option value={GymSalesCategory.event}>대회</option>
      <option value={GymSalesCategory.locker}>사물함</option>
      <option value={GymSalesCategory.other}>기타</option>
    </>
  );
}

export function SalesEntryModal({
  open,
  onOpenChange,
  members,
  products,
  defaultMemberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: SalesEntryMemberOption[];
  products: SalesEntryProductOption[];
  defaultMemberId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<"product" | "manual">("product");
  const [productId, setProductId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [title, setTitle] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [category, setCategory] = useState<string>(GymSalesCategory.other);
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const today = toSeoulDateOnlyString();

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productQuery]);

  const saleNum = Number(saleAmount) || 0;
  const paidNum = Number(paidAmount) || 0;
  const outstanding = Math.max(0, saleNum - paidNum);
  const needsMember = outstanding > 0;

  function resetForm() {
    setError(null);
    setEntryMode("product");
    setProductId("");
    setProductQuery("");
    setTitle("");
    setSaleAmount("");
    setPaidAmount("");
    setCategory(GymSalesCategory.other);
    setMemberId(defaultMemberId ?? "");
  }

  function applyProduct(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setTitle(product.name);
    setSaleAmount(String(product.defaultPrice));
    setPaidAmount(String(product.defaultPrice));
    setCategory(GymSalesCategory.product);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createGymSalesEntryAction(fd);
      if (!res.ok) {
        setError(res.error?.message ?? "매출 등록에 실패했습니다.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[92vh] w-full max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg",
          "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-2xl",
        )}
      >
        <DialogHeader className="border-b border-matchon-border px-4 py-4">
          <DialogTitle>매출 등록</DialogTitle>
          <DialogDescription>
            판매금액과 결제금액을 입력하면 미수금이 자동 계산됩니다.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-3 px-4 py-4">
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={entryMode === "product" ? "default" : "outline"}
              onClick={() => setEntryMode("product")}
            >
              등록 상품
            </Button>
            <Button
              type="button"
              size="sm"
              variant={entryMode === "manual" ? "default" : "outline"}
              onClick={() => {
                setEntryMode("manual");
                setProductId("");
              }}
            >
              직접 입력
            </Button>
          </div>

          {entryMode === "product" ? (
            <div className="space-y-2">
              <label className="block space-y-1 text-sm">
                <span>상품 검색</span>
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="상품 검색..."
                  className={matchonFieldInputClass}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>상품 선택</span>
                <select
                  value={productId}
                  onChange={(e) => applyProduct(e.target.value)}
                  className={matchonFieldInputClass}
                >
                  <option value="">상품을 선택하세요</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatWon(p.defaultPrice)}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="productId" value={productId} />
            </div>
          ) : (
            <input type="hidden" name="productId" value="" />
          )}

          <label className="block space-y-1 text-sm">
            <span>항목명 *</span>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={matchonFieldInputClass}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>판매금액 *</span>
              <input
                name="saleAmount"
                inputMode="numeric"
                required
                value={saleAmount}
                onChange={(e) => {
                  setSaleAmount(e.target.value);
                  if (paidAmount === "" || paidAmount === saleAmount) {
                    setPaidAmount(e.target.value);
                  }
                }}
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>결제금액 *</span>
              <input
                name="paidAmount"
                inputMode="numeric"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={matchonFieldInputClass}
              />
            </label>
          </div>

          <div className="rounded-lg border border-matchon-border bg-matchon-bg-muted/40 px-3 py-2 text-sm">
            <span className="text-matchon-text-secondary">미수금 </span>
            <span className="font-semibold">{formatWon(outstanding)}</span>
            {outstanding > 0 ? (
              <span className="ml-2 text-xs text-amber-700">
                {paidNum > 0 ? "일부 결제" : "미수"}
              </span>
            ) : (
              <span className="ml-2 text-xs text-emerald-700">결제 완료</span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <CategoryOptions />
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>
                회원 {needsMember ? "*" : "(선택)"}
              </span>
              <select
                name="gymMemberId"
                required={needsMember}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className={matchonFieldInputClass}
              >
                <option value="">
                  {needsMember ? "회원 선택 (필수)" : "없음 / 일반 판매"}
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span>메모</span>
            <input name="memo" className={matchonFieldInputClass} />
          </label>

          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "등록 중…" : "매출 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
