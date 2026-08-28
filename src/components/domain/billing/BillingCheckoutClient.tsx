"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import {
  confirmBillingCheckoutAction,
  prepareTossBillingCheckoutAction,
  previewBillingCheckoutAction,
} from "@/features/billing/actions";
import { yearlySavingsLabel } from "@/lib/billing/checkout-calculator";

export type CheckoutPlanVM = {
  id: string;
  code: string;
  name: string;
  interval: "MONTH" | "YEAR";
  price: number;
};

type PreviewState = {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  freeMonths: number;
  trialEndAt: string | null;
  coupon: {
    id: string;
    code: string;
    name: string;
    type: string;
    benefitLabel: string;
  } | null;
};

function formatKrw(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR");
}

async function loadTossSdk(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.TossPayments) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Toss SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

export function BillingCheckoutClient({
  plans,
  brandName = BRAND_NAME,
  tossClientKey,
  tossReady,
  isTestKey,
  requirePmForTrial,
}: {
  plans: CheckoutPlanVM[];
  brandName?: string;
  tossClientKey: string | null;
  tossReady: boolean;
  isTestKey: boolean;
  requirePmForTrial: boolean;
}) {
  const router = useRouter();
  const monthly = plans.find((p) => p.interval === "MONTH") ?? plans[0];
  const yearly = plans.find((p) => p.interval === "YEAR");
  const [planId, setPlanId] = useState(monthly?.id ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = plans.find((p) => p.id === planId) ?? monthly;
  const savings =
    monthly && yearly
      ? yearlySavingsLabel(monthly.price, yearly.price)
      : null;

  const display = useMemo(() => {
    if (preview) return preview;
    const price = selected?.price ?? 0;
    return {
      originalAmount: price,
      discountAmount: 0,
      finalAmount: price,
      freeMonths: 0,
      trialEndAt: null,
      coupon: null,
    } satisfies PreviewState;
  }, [preview, selected]);

  const needsPaymentMethod =
    display.finalAmount > 0 ||
    (display.freeMonths > 0 && requirePmForTrial);

  function runPreview(code: string | null) {
    if (!planId) return;
    setError(null);
    startTransition(async () => {
      const res = await previewBillingCheckoutAction({
        planId,
        couponCode: code,
      });
      if (!res.ok) {
        setError(res.error);
        setPreview(null);
        setAppliedCode(null);
        return;
      }
      const trial =
        res.data.trialEndAt instanceof Date
          ? res.data.trialEndAt.toISOString()
          : res.data.trialEndAt
            ? String(res.data.trialEndAt)
            : null;
      setPreview({
        originalAmount: res.data.originalAmount,
        discountAmount: res.data.discountAmount,
        finalAmount: res.data.finalAmount,
        freeMonths: res.data.freeMonths,
        trialEndAt: trial,
        coupon: res.data.coupon,
      });
      setAppliedCode(res.data.coupon?.code ?? null);
    });
  }

  function onSelectPlan(id: string) {
    setPlanId(id);
    setPreview(null);
    setAppliedCode(null);
    setError(null);
  }

  function onConfirm() {
    if (!planId) return;
    setError(null);
    startTransition(async () => {
      // Free without PM requirement — Phase 1 path
      if (display.finalAmount === 0 && !needsPaymentMethod) {
        const res = await confirmBillingCheckoutAction({
          planId,
          couponCode: appliedCode,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.data.mode === "activated") {
          const q = new URLSearchParams({
            mode: "activated",
            plan: res.data.plan.name,
            amount: String(res.data.finalAmount),
            freeMonths: String(res.data.freeMonths),
            trialEndAt: res.data.trialEndAt ?? "",
            periodEnd: res.data.currentPeriodEnd ?? "",
          });
          router.push(`/billing/success?${q.toString()}`);
          return;
        }
        setError(res.data.providerMessage || "결제를 시작할 수 없습니다.");
        return;
      }

      if (!tossReady || !tossClientKey) {
        setError(
          "유료 결제(Toss Billing)가 아직 설정되지 않았습니다. 무료 쿠폰을 사용하거나 관리자에게 문의하세요.",
        );
        return;
      }

      const prep = await prepareTossBillingCheckoutAction({
        planId,
        couponCode: appliedCode,
      });
      if (!prep.ok) {
        setError(prep.error);
        return;
      }

      try {
        await loadTossSdk();
        if (!window.TossPayments) {
          throw new Error("TossPayments SDK를 사용할 수 없습니다.");
        }
        const toss = window.TossPayments(prep.data.clientKey);
        const payment = toss.payment({ customerKey: prep.data.customerKey });
        const origin = window.location.origin;
        await payment.requestBillingAuth({
          method: "CARD",
          successUrl: `${origin}/billing/toss/success?orderId=${encodeURIComponent(prep.data.orderId)}`,
          failUrl: `${origin}/billing/toss/fail?orderId=${encodeURIComponent(prep.data.orderId)}`,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "결제창을 열 수 없습니다.");
      }
    });
  }

  const ctaLabel =
    display.finalAmount === 0
      ? needsPaymentMethod
        ? "카드 등록 후 무료 이용 시작"
        : "무료 이용 시작하기"
      : `${formatKrw(display.finalAmount)} 결제하고 시작하기`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 md:py-12">
      {isTestKey ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
          TEST 결제 — 실제 청구되지 않는 테스트 키입니다.
        </p>
      ) : null}

      <header className="space-y-2 text-center">
        <p className="text-sm font-bold tracking-wide text-matchon-primary">
          {brandName}
        </p>
        <h1 className="text-2xl font-bold text-matchon-text-primary">
          {brandName} 이용권
        </h1>
        <p className="text-sm text-matchon-text-secondary">
          서비스를 이용할 요금제를 선택해주세요.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          1. 이용권 선택
        </h2>
        <div className="grid gap-3">
          {plans.map((plan) => {
            const active = plan.id === planId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlan(plan.id)}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-matchon-primary bg-matchon-primary/5 ring-2 ring-matchon-primary/30"
                    : "border-matchon-border bg-white hover:border-matchon-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-matchon-text-primary">
                      {plan.name}
                    </p>
                    <p className="mt-1 text-sm text-matchon-text-secondary">
                      {plan.interval === "YEAR"
                        ? "연간 이용"
                        : "매월 결제"}
                    </p>
                    {plan.interval === "YEAR" && savings ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        월간 대비 {formatKrw(savings.savedAmount)} 절약 (
                        {savings.percentOff}%)
                      </p>
                    ) : null}
                  </div>
                  <p className="text-lg font-bold text-matchon-text-primary">
                    {formatKrw(plan.price)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-semibold text-matchon-text-primary">
          2. 쿠폰 / 프로모션
        </h2>
        <div className="flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="쿠폰 코드 입력"
            className="min-w-0 flex-1 rounded-lg border border-matchon-border px-3 py-2 text-sm outline-none focus:border-matchon-primary"
            autoCapitalize="characters"
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending || !couponInput.trim()}
            onClick={() => runPreview(couponInput.trim() || null)}
          >
            적용
          </Button>
        </div>
        {appliedCode && display.coupon ? (
          <div className="rounded-lg bg-matchon-primary/5 px-3 py-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{display.coupon.code}</p>
                <p className="text-matchon-text-secondary">
                  {display.coupon.name}
                </p>
                <p className="mt-1 font-medium text-emerald-700">
                  {display.coupon.benefitLabel}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-matchon-text-secondary underline"
                onClick={() => {
                  setCouponInput("");
                  setAppliedCode(null);
                  setPreview(null);
                }}
              >
                적용 취소
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-semibold">3. 결제 예정 내역</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-matchon-text-secondary">이용권</span>
            <span>{selected?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-matchon-text-secondary">정상금액</span>
            <span>{formatKrw(display.originalAmount)}</span>
          </div>
          {display.discountAmount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>쿠폰 할인</span>
              <span>-{formatKrw(display.discountAmount)}</span>
            </div>
          ) : null}
        </div>
        <div className="border-t border-matchon-border pt-3">
          <p className="text-xs text-matchon-text-secondary">오늘 결제</p>
          <p className="mt-1 text-3xl font-extrabold text-matchon-text-primary">
            {formatKrw(display.finalAmount)}
          </p>
          {display.freeMonths > 0 ? (
            <p className="mt-2 text-sm text-matchon-text-secondary">
              무료 이용 {formatDate(new Date().toISOString())} ~{" "}
              {formatDate(display.trialEndAt)}
              <br />
              무료기간 종료 후{" "}
              {selected?.interval === "YEAR" ? "연" : "월"}{" "}
              {formatKrw(selected?.price ?? 0)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-matchon-text-secondary">
              결제 성공일 기준{" "}
              {selected?.interval === "YEAR" ? "1년" : "1개월"} 이용
            </p>
          )}
        </div>
      </section>

      {needsPaymentMethod ? (
        <section className="rounded-xl border border-matchon-border bg-white p-4 text-sm">
          <h2 className="font-semibold">4. 결제수단</h2>
          <p className="mt-2 text-matchon-text-secondary">
            Toss 자동결제(빌링)로 카드를 등록합니다. 카드번호는 MATCHON에
            저장되지 않습니다.
          </p>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending || !planId}
        onClick={onConfirm}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
