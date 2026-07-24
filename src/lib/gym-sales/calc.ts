/**
 * 체육관 매출 계산 순수 로직 SSOT.
 * 실제 납부금액(amount)만 매출. 미수금·취소·이용권 정가 제외.
 * 환불은 refundedAt 날짜에 차감.
 */

import {
  getSeoulYmdParts,
  toSeoulAttendanceDate,
  toSeoulDateOnlyString,
} from "@/lib/gym-attendance/seoul-date";

export type SalesPeriodKey =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export function getSalesPeriodRange(
  key: SalesPeriodKey,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): { start: Date; endExclusive: Date; label: string } {
  const { year, month, day } = getSeoulYmdParts(now);
  const today = new Date(Date.UTC(year, month - 1, day));

  if (key === "today") {
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: today, endExclusive: end, label: "오늘" };
  }

  if (key === "this_week") {
    const dow = today.getUTCDay();
    const fromMon = dow === 0 ? 6 : dow - 1;
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - fromMon);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, endExclusive: end, label: "이번 주" };
  }

  if (key === "last_month") {
    const start = new Date(Date.UTC(year, month - 2, 1));
    const end = new Date(Date.UTC(year, month - 1, 1));
    return { start, endExclusive: end, label: "지난달" };
  }

  if (key === "custom" && customFrom && customTo) {
    const start = parseYmd(customFrom);
    const endDay = parseYmd(customTo);
    if (start && endDay) {
      const end = new Date(endDay);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, endExclusive: end, label: "직접 설정" };
    }
  }

  // this_month default
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, endExclusive: end, label: "이번 달" };
}

function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** 진행 중 월과 동일 일수 전월 비교 구간 */
export function getComparablePriorMonthRange(
  now = new Date(),
): { start: Date; endExclusive: Date } {
  const { year, month, day } = getSeoulYmdParts(now);
  const priorStart = new Date(Date.UTC(year, month - 2, 1));
  const lastDayPrior = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const priorDay = Math.min(day, lastDayPrior);
  const priorEnd = new Date(Date.UTC(year, month - 2, priorDay + 1));
  return { start: priorStart, endExclusive: priorEnd };
}

export function dateKeySeoul(at: Date): string {
  return toSeoulDateOnlyString(at);
}

export function inRange(at: Date, start: Date, endExclusive: Date): boolean {
  const d = toSeoulAttendanceDate(at).getTime();
  return d >= start.getTime() && d < endExclusive.getTime();
}

export type PaymentLike = {
  amount: number;
  paidAt: Date;
  status: string;
  paymentMethod: string;
  category: string | null;
  discountAmount: number;
  listPrice: number | null;
};

export type RefundLike = {
  amount: number;
  refundedAt: Date;
  cancelledAt: Date | null;
  refundMethod: string;
};

export type ManualSaleLike = {
  amount: number;
  soldAt: Date;
  status: string;
  paymentMethod: string;
  category: string;
  discountAmount: number;
  listPrice: number | null;
};

export function computeNetSales(input: {
  payments: PaymentLike[];
  manualSales: ManualSaleLike[];
  refunds: RefundLike[];
  start: Date;
  endExclusive: Date;
}): {
  grossPaid: number;
  refundTotal: number;
  netSales: number;
  discountTotal: number;
  paymentCount: number;
  refundCount: number;
} {
  let grossPaid = 0;
  let discountTotal = 0;
  let paymentCount = 0;

  for (const p of input.payments) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    if (!inRange(p.paidAt, input.start, input.endExclusive)) continue;
    grossPaid += p.amount;
    discountTotal += Math.max(0, p.discountAmount || 0);
    paymentCount += 1;
  }
  for (const s of input.manualSales) {
    if (s.status !== "paid" && s.status !== "refunded") continue;
    if (!inRange(s.soldAt, input.start, input.endExclusive)) continue;
    grossPaid += s.amount;
    discountTotal += Math.max(0, s.discountAmount || 0);
    paymentCount += 1;
  }

  let refundTotal = 0;
  let refundCount = 0;
  for (const r of input.refunds) {
    if (r.cancelledAt) continue;
    if (!inRange(r.refundedAt, input.start, input.endExclusive)) continue;
    refundTotal += r.amount;
    refundCount += 1;
  }

  return {
    grossPaid,
    refundTotal,
    netSales: grossPaid - refundTotal,
    discountTotal,
    paymentCount,
    refundCount,
  };
}

export function buildDailySeries(input: {
  payments: PaymentLike[];
  manualSales: ManualSaleLike[];
  refunds: RefundLike[];
  start: Date;
  endExclusive: Date;
}): Array<{
  date: string;
  paid: number;
  refund: number;
  net: number;
}> {
  const map = new Map<string, { paid: number; refund: number }>();
  for (
    let t = input.start.getTime();
    t < input.endExclusive.getTime();
    t += 86_400_000
  ) {
    const key = toSeoulDateOnlyString(new Date(t));
    map.set(key, { paid: 0, refund: 0 });
  }

  for (const p of input.payments) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    if (!inRange(p.paidAt, input.start, input.endExclusive)) continue;
    const key = dateKeySeoul(p.paidAt);
    const row = map.get(key);
    if (row) row.paid += p.amount;
  }
  for (const s of input.manualSales) {
    if (s.status !== "paid" && s.status !== "refunded") continue;
    if (!inRange(s.soldAt, input.start, input.endExclusive)) continue;
    const key = dateKeySeoul(s.soldAt);
    const row = map.get(key);
    if (row) row.paid += s.amount;
  }
  for (const r of input.refunds) {
    if (r.cancelledAt) continue;
    if (!inRange(r.refundedAt, input.start, input.endExclusive)) continue;
    const key = dateKeySeoul(r.refundedAt);
    const row = map.get(key);
    if (row) row.refund += r.amount;
  }

  return [...map.entries()].map(([date, v]) => ({
    date,
    paid: v.paid,
    refund: v.refund,
    net: v.paid - v.refund,
  }));
}

export function groupByPaymentMethod(input: {
  payments: PaymentLike[];
  manualSales: ManualSaleLike[];
  refunds: RefundLike[];
  start: Date;
  endExclusive: Date;
}): Array<{ method: string; net: number }> {
  const map = new Map<string, number>();
  const add = (method: string, delta: number) => {
    const key = method || "unspecified";
    map.set(key, (map.get(key) ?? 0) + delta);
  };

  for (const p of input.payments) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    if (!inRange(p.paidAt, input.start, input.endExclusive)) continue;
    add(p.paymentMethod, p.amount);
  }
  for (const s of input.manualSales) {
    if (s.status !== "paid" && s.status !== "refunded") continue;
    if (!inRange(s.soldAt, input.start, input.endExclusive)) continue;
    add(s.paymentMethod, s.amount);
  }
  for (const r of input.refunds) {
    if (r.cancelledAt) continue;
    if (!inRange(r.refundedAt, input.start, input.endExclusive)) continue;
    add(r.refundMethod, -r.amount);
  }

  return [...map.entries()]
    .map(([method, net]) => ({ method, net }))
    .sort((a, b) => b.net - a.net);
}

export function groupByCategory(input: {
  payments: PaymentLike[];
  manualSales: ManualSaleLike[];
  start: Date;
  endExclusive: Date;
}): Array<{ category: string; amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  const add = (category: string | null, amount: number) => {
    const key = category ?? "unclassified";
    const row = map.get(key) ?? { amount: 0, count: 0 };
    row.amount += amount;
    row.count += 1;
    map.set(key, row);
  };

  for (const p of input.payments) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    if (!inRange(p.paidAt, input.start, input.endExclusive)) continue;
    add(p.category, p.amount);
  }
  for (const s of input.manualSales) {
    if (s.status !== "paid" && s.status !== "refunded") continue;
    if (!inRange(s.soldAt, input.start, input.endExclusive)) continue;
    add(s.category, s.amount);
  }

  return [...map.entries()]
    .map(([category, v]) => ({ category, amount: v.amount, count: v.count }))
    .sort((a, b) => b.amount - a.amount);
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "cash":
      return "현금";
    case "card":
      return "카드";
    case "transfer":
      return "계좌이체";
    case "easy_pay":
      return "간편결제";
    case "other":
      return "기타";
    case "unspecified":
      return "미지정";
    default:
      return method;
  }
}

export function salesCategoryLabel(category: string | null | undefined): string {
  switch (category) {
    case "membership":
      return "회원권";
    case "personal_lesson":
      return "개인 레슨";
    case "group_class":
      return "그룹 수업";
    case "product":
      return "용품";
    case "event":
      return "대회";
    case "other":
      return "기타";
    case "unclassified":
    case null:
    case undefined:
      return "미분류";
    default:
      return category;
  }
}

export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
