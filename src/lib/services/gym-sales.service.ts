/**
 * 체육관 매출 SSOT 서비스.
 * 실제 납부(GymMemberPayment.amount · GymManualSale.amount) − 환불(GymPaymentRefund).
 * 미수금(GymReceivable)은 매출에 포함하지 않음.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymReceivableStatus,
  GymSalesCategory,
} from "@/lib/enums";
import { parseDateOnlyString } from "@/lib/date-only";
import {
  buildDailySeries,
  computeNetSales,
  getComparablePriorMonthRange,
  getSalesPeriodRange,
  groupByCategory,
  groupByPaymentMethod,
  paymentMethodLabel,
  percentOf,
  salesCategoryLabel,
  type SalesPeriodKey,
} from "@/lib/gym-sales/calc";
import {
  getSeoulYmdParts,
  toSeoulAttendanceDate,
} from "@/lib/gym-attendance/seoul-date";
import { maskPhoneForAdminList } from "@/lib/gym-attendance/privacy";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";

function assertNonNegInt(n: number, label: string) {
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) 0 이상 정수여야 합니다.`,
    );
  }
}

function assertPositiveInt(n: number, label: string) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) 0보다 큰 정수여야 합니다.`,
    );
  }
}

function parsePaidAt(value?: Date | string | null): Date {
  if (!value) return toSeoulAttendanceDate(new Date());
  if (typeof value === "string") {
    const d = parseDateOnlyString(value);
    if (!d) {
      throw new AppError("VALIDATION_ERROR", "날짜 형식이 올바르지 않습니다.");
    }
    return d;
  }
  return toSeoulAttendanceDate(value);
}

function assertNotFutureSeoulDate(date: Date, label: string) {
  const today = toSeoulAttendanceDate(new Date());
  if (date.getTime() > today.getTime()) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) 미래일 수 없습니다.`,
    );
  }
}

async function loadSalesSourceRows(gymId: string) {
  const [payments, manualSales, refunds] = await Promise.all([
    prisma.gymMemberPayment.findMany({
      where: { gymId },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        status: true,
        paymentMethod: true,
        category: true,
        discountAmount: true,
        listPrice: true,
        gymMemberId: true,
        memo: true,
        createdByUserId: true,
        receivableId: true,
        subscriptionId: true,
        member: { select: { name: true, phone: true } },
      },
    }),
    prisma.gymManualSale.findMany({
      where: { gymId },
      select: {
        id: true,
        amount: true,
        soldAt: true,
        status: true,
        paymentMethod: true,
        category: true,
        discountAmount: true,
        listPrice: true,
        title: true,
        gymMemberId: true,
        memo: true,
        createdByUserId: true,
        member: { select: { name: true, phone: true } },
      },
    }),
    prisma.gymPaymentRefund.findMany({
      where: { gymId, cancelledAt: null },
      select: {
        id: true,
        amount: true,
        refundedAt: true,
        cancelledAt: true,
        refundMethod: true,
        paymentId: true,
        manualSaleId: true,
        reason: true,
        memo: true,
      },
    }),
  ]);
  return { payments, manualSales, refunds };
}

function receivableRemaining(total: number, paid: number): number {
  return Math.max(0, total - paid);
}

function deriveReceivableStatus(input: {
  status: GymReceivableStatus;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date | null;
  cancelledAt: Date | null;
}): GymReceivableStatus {
  if (input.cancelledAt || input.status === GymReceivableStatus.cancelled) {
    return GymReceivableStatus.cancelled;
  }
  if (input.paidAmount >= input.totalAmount) {
    return GymReceivableStatus.paid;
  }
  const today = toSeoulAttendanceDate(new Date());
  const overdue =
    input.dueDate != null &&
    toSeoulAttendanceDate(input.dueDate).getTime() < today.getTime();
  if (input.paidAmount > 0) {
    return overdue ? GymReceivableStatus.overdue : GymReceivableStatus.partial;
  }
  return overdue ? GymReceivableStatus.overdue : GymReceivableStatus.pending;
}

export const gymSalesService = {
  async getDashboard(
    actor: ActorContext,
    input: {
      period?: SalesPeriodKey;
      from?: string;
      to?: string;
      memberNameQ?: string;
      phoneTail?: string;
      paymentMethod?: string;
      status?: string;
      category?: string;
      sort?: "recent" | "amount_desc" | "amount_asc";
    } = {},
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const periodKey = input.period ?? "this_month";
    const range = getSalesPeriodRange(periodKey, input.from, input.to);
    const { payments, manualSales, refunds } = await loadSalesSourceRows(
      access.gymId,
    );

    const periodStats = computeNetSales({
      payments,
      manualSales,
      refunds,
      start: range.start,
      endExclusive: range.endExclusive,
    });

    const todayRange = getSalesPeriodRange("today");
    const todayStats = computeNetSales({
      payments,
      manualSales,
      refunds,
      start: todayRange.start,
      endExclusive: todayRange.endExclusive,
    });

    const monthRange = getSalesPeriodRange("this_month");
    const monthStats = computeNetSales({
      payments,
      manualSales,
      refunds,
      start: monthRange.start,
      endExclusive: monthRange.endExclusive,
    });

    const { year, month, day } = getSeoulYmdParts();
    const mtdStart = new Date(Date.UTC(year, month - 1, 1));
    const mtdEnd = new Date(Date.UTC(year, month - 1, day + 1));
    const mtdStats = computeNetSales({
      payments,
      manualSales,
      refunds,
      start: mtdStart,
      endExclusive: mtdEnd,
    });
    const prior = getComparablePriorMonthRange();
    const priorStats = computeNetSales({
      payments,
      manualSales,
      refunds,
      start: prior.start,
      endExclusive: prior.endExclusive,
    });
    const momPct =
      priorStats.netSales === 0
        ? mtdStats.netSales === 0
          ? 0
          : 100
        : Math.round(
            ((mtdStats.netSales - priorStats.netSales) /
              Math.abs(priorStats.netSales)) *
              1000,
          ) / 10;

    const receivables = await prisma.gymReceivable.findMany({
      where: {
        gymId: access.gymId,
        cancelledAt: null,
        status: { not: GymReceivableStatus.cancelled },
      },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        cancelledAt: true,
        gymMemberId: true,
      },
    });

    let outstandingTotal = 0;
    const outstandingMemberIds = new Set<string>();
    for (const r of receivables) {
      const status = deriveReceivableStatus(r);
      if (
        status === GymReceivableStatus.paid ||
        status === GymReceivableStatus.cancelled
      ) {
        continue;
      }
      const rem = receivableRemaining(r.totalAmount, r.paidAmount);
      if (rem > 0) {
        outstandingTotal += rem;
        outstandingMemberIds.add(r.gymMemberId);
      }
    }

    const monthRefundStats = computeNetSales({
      payments: [],
      manualSales: [],
      refunds,
      start: monthRange.start,
      endExclusive: monthRange.endExclusive,
    });

    const daily = buildDailySeries({
      payments,
      manualSales,
      refunds,
      start: range.start,
      endExclusive: range.endExclusive,
    });

    const byMethod = groupByPaymentMethod({
      payments,
      manualSales,
      refunds,
      start: range.start,
      endExclusive: range.endExclusive,
    });
    const methodGross = byMethod.reduce((s, r) => s + Math.max(0, r.net), 0);

    const byCategory = groupByCategory({
      payments,
      manualSales,
      start: range.start,
      endExclusive: range.endExclusive,
    });
    const categoryGross = byCategory.reduce((s, r) => s + r.amount, 0);

    const memberIdsInPeriod = new Set<string>();
    for (const p of payments) {
      if (p.status !== "paid" && p.status !== "refunded") continue;
      if (
        p.paidAt.getTime() >= range.start.getTime() &&
        p.paidAt.getTime() < range.endExclusive.getTime()
      ) {
        memberIdsInPeriod.add(p.gymMemberId);
      }
    }
    for (const s of manualSales) {
      if (
        (s.status !== "paid" && s.status !== "refunded") ||
        !s.gymMemberId
      ) {
        continue;
      }
      if (
        s.soldAt.getTime() >= range.start.getTime() &&
        s.soldAt.getTime() < range.endExclusive.getTime()
      ) {
        memberIdsInPeriod.add(s.gymMemberId);
      }
    }

    const refundByPayment = new Map<string, number>();
    const refundByManual = new Map<string, number>();
    for (const r of refunds) {
      if (r.paymentId) {
        refundByPayment.set(
          r.paymentId,
          (refundByPayment.get(r.paymentId) ?? 0) + r.amount,
        );
      }
      if (r.manualSaleId) {
        refundByManual.set(
          r.manualSaleId,
          (refundByManual.get(r.manualSaleId) ?? 0) + r.amount,
        );
      }
    }

    type TxRow = {
      id: string;
      source: "MEMBER_PAYMENT" | "MANUAL_SALE";
      paidAt: Date;
      memberName: string | null;
      maskedPhone: string | null;
      title: string;
      listPrice: number | null;
      discountAmount: number;
      amount: number;
      refundAmount: number;
      net: number;
      paymentMethod: string;
      status: string;
      category: string | null;
      createdByUserId: string | null;
      memberId: string | null;
    };

    const transactions: TxRow[] = [];
    for (const p of payments) {
      const refundAmount = refundByPayment.get(p.id) ?? 0;
      transactions.push({
        id: p.id,
        source: "MEMBER_PAYMENT",
        paidAt: p.paidAt,
        memberName: p.member.name,
        maskedPhone: maskPhoneForAdminList(p.member.phone),
        title: p.subscriptionId ? "회원권 결제" : "회원 결제",
        listPrice: p.listPrice,
        discountAmount: p.discountAmount,
        amount: p.amount,
        refundAmount,
        net: p.status === "cancelled" ? 0 : p.amount - refundAmount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        category: p.category,
        createdByUserId: p.createdByUserId,
        memberId: p.gymMemberId,
      });
    }
    for (const s of manualSales) {
      const refundAmount = refundByManual.get(s.id) ?? 0;
      transactions.push({
        id: s.id,
        source: "MANUAL_SALE",
        paidAt: s.soldAt,
        memberName: s.member?.name ?? null,
        maskedPhone: s.member ? maskPhoneForAdminList(s.member.phone) : null,
        title: s.title,
        listPrice: s.listPrice,
        discountAmount: s.discountAmount,
        amount: s.amount,
        refundAmount,
        net: s.status === "cancelled" ? 0 : s.amount - refundAmount,
        paymentMethod: s.paymentMethod,
        status: s.status,
        category: s.category,
        createdByUserId: s.createdByUserId,
        memberId: s.gymMemberId,
      });
    }

    let filtered = transactions.filter((t) => {
      if (
        t.paidAt.getTime() < range.start.getTime() ||
        t.paidAt.getTime() >= range.endExclusive.getTime()
      ) {
        return false;
      }
      if (input.memberNameQ) {
        const q = input.memberNameQ.trim();
        if (q && !(t.memberName ?? "").includes(q)) return false;
      }
      if (input.phoneTail) {
        const tail = input.phoneTail.replace(/\D/g, "");
        if (tail && !(t.maskedPhone ?? "").includes(tail)) return false;
      }
      if (input.paymentMethod && t.paymentMethod !== input.paymentMethod) {
        return false;
      }
      if (input.status && t.status !== input.status) return false;
      if (input.category) {
        if (input.category === "unclassified") {
          if (t.category != null) return false;
        } else if (t.category !== input.category) {
          return false;
        }
      }
      return true;
    });

    const sort = input.sort ?? "recent";
    filtered = filtered.sort((a, b) => {
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      return b.paidAt.getTime() - a.paidAt.getTime();
    });

    return {
      period: {
        key: periodKey,
        label: range.label,
        start: range.start,
        endExclusive: range.endExclusive,
      },
      cards: {
        todayNet: todayStats.netSales,
        todayPaymentCount: todayStats.paymentCount,
        monthNet: monthStats.netSales,
        monthMomPct: momPct,
        monthRefund: monthRefundStats.refundTotal,
        monthRefundCount: monthRefundStats.refundCount,
        outstandingTotal,
        outstandingMemberCount: outstandingMemberIds.size,
      },
      periodSummary: {
        grossPaid: periodStats.grossPaid,
        discountTotal: periodStats.discountTotal,
        refundTotal: periodStats.refundTotal,
        netSales: periodStats.netSales,
        paymentCount: periodStats.paymentCount,
        payingMemberCount: memberIdsInPeriod.size,
        avgPayment:
          periodStats.paymentCount > 0
            ? Math.round(periodStats.grossPaid / periodStats.paymentCount)
            : 0,
      },
      daily,
      byMethod: byMethod.map((r) => ({
        method: r.method,
        label: paymentMethodLabel(r.method),
        net: r.net,
        percent: percentOf(Math.max(0, r.net), methodGross),
      })),
      byCategory: byCategory.map((r) => ({
        category: r.category,
        label: salesCategoryLabel(r.category),
        amount: r.amount,
        count: r.count,
        percent: percentOf(r.amount, categoryGross),
      })),
      transactions: filtered.slice(0, 200).map((t) => ({
        ...t,
        paymentMethodLabel: paymentMethodLabel(t.paymentMethod),
        categoryLabel: salesCategoryLabel(t.category),
      })),
      disclaimer:
        "MATCHON 매출 현황은 등록된 결제 내역을 기준으로 제공됩니다. 세무 신고 자료와 실제 입금 내역은 별도로 확인해 주세요.",
    };
  },

  async getHomeSalesSnippet(actor: ActorContext) {
    try {
      const access = await requireGymPortalSalesManage(actor);
      const { payments, manualSales, refunds } = await loadSalesSourceRows(
        access.gymId,
      );
      const today = getSalesPeriodRange("today");
      const month = getSalesPeriodRange("this_month");
      const todayStats = computeNetSales({
        payments,
        manualSales,
        refunds,
        start: today.start,
        endExclusive: today.endExclusive,
      });
      const monthStats = computeNetSales({
        payments,
        manualSales,
        refunds,
        start: month.start,
        endExclusive: month.endExclusive,
      });
      const receivables = await prisma.gymReceivable.findMany({
        where: {
          gymId: access.gymId,
          cancelledAt: null,
          status: { not: GymReceivableStatus.cancelled },
        },
        select: {
          totalAmount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
          cancelledAt: true,
          gymMemberId: true,
        },
      });
      let outstandingTotal = 0;
      for (const r of receivables) {
        const status = deriveReceivableStatus(r);
        if (
          status === GymReceivableStatus.paid ||
          status === GymReceivableStatus.cancelled
        ) {
          continue;
        }
        outstandingTotal += receivableRemaining(r.totalAmount, r.paidAmount);
      }
      return {
        todayNet: todayStats.netSales,
        monthNet: monthStats.netSales,
        outstandingTotal,
      };
    } catch {
      return null;
    }
  },

  async getMemberSalesSummary(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalSalesManage(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const [payments, refunds, receivables] = await Promise.all([
      prisma.gymMemberPayment.findMany({
        where: { gymId: access.gymId, gymMemberId: memberId },
        orderBy: { paidAt: "desc" },
      }),
      prisma.gymPaymentRefund.findMany({
        where: {
          gymId: access.gymId,
          cancelledAt: null,
          payment: { gymMemberId: memberId },
        },
        orderBy: { refundedAt: "desc" },
      }),
      prisma.gymReceivable.findMany({
        where: {
          gymId: access.gymId,
          gymMemberId: memberId,
          cancelledAt: null,
        },
      }),
    ]);

    const paidPayments = payments.filter(
      (p) =>
        p.status === GymMemberPaymentStatus.paid ||
        p.status === GymMemberPaymentStatus.refunded,
    );
    const grossPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
    const refundTotal = refunds.reduce((s, r) => s + r.amount, 0);
    let outstanding = 0;
    for (const r of receivables) {
      const status = deriveReceivableStatus(r);
      if (
        status !== GymReceivableStatus.paid &&
        status !== GymReceivableStatus.cancelled
      ) {
        outstanding += receivableRemaining(r.totalAmount, r.paidAmount);
      }
    }
    const latestPaidAt = paidPayments[0]?.paidAt ?? null;

    return {
      grossPaid,
      refundTotal,
      netSales: grossPaid - refundTotal,
      outstanding,
      latestPaidAt,
      payments: payments.map((p) => ({
        id: p.id,
        paidAt: p.paidAt,
        amount: p.amount,
        discountAmount: p.discountAmount,
        listPrice: p.listPrice,
        paymentMethod: p.paymentMethod,
        paymentMethodLabel: paymentMethodLabel(p.paymentMethod),
        status: p.status,
        category: p.category,
        categoryLabel: salesCategoryLabel(p.category),
        memo: p.memo,
      })),
      refunds: refunds.map((r) => ({
        id: r.id,
        refundedAt: r.refundedAt,
        amount: r.amount,
        reason: r.reason,
        paymentId: r.paymentId,
      })),
    };
  },

  async createManualSale(
    actor: ActorContext,
    input: {
      title: string;
      amount: number;
      soldAt?: Date | string;
      paymentMethod?: GymMemberPaymentMethod;
      category?: GymSalesCategory;
      listPrice?: number | null;
      discountAmount?: number;
      gymMemberId?: string | null;
      productId?: string | null;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    assertPositiveInt(input.amount, "금액");
    const discount = input.discountAmount ?? 0;
    assertNonNegInt(discount, "할인금액");
    if (input.listPrice != null) {
      assertNonNegInt(input.listPrice, "정가");
      if (discount > input.listPrice) {
        throw new AppError(
          "VALIDATION_ERROR",
          "할인금액이 정가를 초과합니다.",
        );
      }
    }
    const soldAt = parsePaidAt(input.soldAt ?? null);
    assertNotFutureSeoulDate(soldAt, "매출일");

    if (input.gymMemberId) {
      const member = await gymMemberRepository.findByIdForGym(
        input.gymMemberId,
        access.gymId,
      );
      if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }

    let productId: string | null = null;
    if (input.productId) {
      const product = await prisma.gymProduct.findFirst({
        where: {
          id: input.productId,
          gymId: access.gymId,
          deletedAt: null,
        },
      });
      if (!product) {
        throw new AppError("NOT_FOUND", "상품을 찾을 수 없습니다.");
      }
      productId = product.id;
    }

    const title = input.title.trim();
    if (!title) {
      throw new AppError("VALIDATION_ERROR", "항목명을 입력해 주세요.");
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.gymManualSale.create({
        data: {
          gymId: access.gymId,
          gymMemberId: input.gymMemberId ?? null,
          productId,
          title,
          category: input.category ?? GymSalesCategory.other,
          soldAt,
          amount: input.amount,
          listPrice: input.listPrice ?? null,
          discountAmount: discount,
          paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
          status: GymMemberPaymentStatus.paid,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_sales_manual_created,
          targetType: "GymManualSale",
          targetId: created.id,
          afterData: {
            amount: created.amount,
            category: created.category,
            source: "MANUAL_SALE",
            productId,
          },
        },
        tx,
      );
      return created;
    });
  },

  async cancelManualSale(actor: ActorContext, saleId: string, memo?: string) {
    const access = await requireGymPortalSalesManage(actor);
    const sale = await prisma.gymManualSale.findFirst({
      where: { id: saleId, gymId: access.gymId },
    });
    if (!sale) throw new AppError("NOT_FOUND", "수기 매출을 찾을 수 없습니다.");
    if (sale.status !== GymMemberPaymentStatus.paid) {
      throw new AppError("VALIDATION_ERROR", "이미 취소된 매출입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.gymManualSale.update({
        where: { id: saleId },
        data: {
          status: GymMemberPaymentStatus.cancelled,
          cancelledAt: new Date(),
          memo: memo ?? sale.memo,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_sales_manual_cancelled,
          targetType: "GymManualSale",
          targetId: saleId,
          afterData: { amount: sale.amount },
        },
        tx,
      );
    });
  },

  async createRefund(
    actor: ActorContext,
    input: {
      paymentId?: string;
      manualSaleId?: string;
      amount: number;
      refundedAt?: Date | string;
      refundMethod?: GymMemberPaymentMethod;
      reason?: string;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    assertPositiveInt(input.amount, "환불금액");
    if (!input.paymentId && !input.manualSaleId) {
      throw new AppError("VALIDATION_ERROR", "환불 대상을 지정해 주세요.");
    }
    if (input.paymentId && input.manualSaleId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "환불 대상은 하나만 지정할 수 있습니다.",
      );
    }

    const refundedAt = parsePaidAt(input.refundedAt ?? null);
    assertNotFutureSeoulDate(refundedAt, "환불일");

    return prisma.$transaction(async (tx) => {
      let payableAmount = 0;
      let existingRefunds = 0;

      if (input.paymentId) {
        const payment = await tx.gymMemberPayment.findFirst({
          where: { id: input.paymentId, gymId: access.gymId },
          include: { refunds: { where: { cancelledAt: null } } },
        });
        if (!payment) {
          throw new AppError("NOT_FOUND", "결제를 찾을 수 없습니다.");
        }
        if (payment.status === GymMemberPaymentStatus.cancelled) {
          throw new AppError(
            "VALIDATION_ERROR",
            "취소된 결제는 환불할 수 없습니다.",
          );
        }
        payableAmount = payment.amount;
        existingRefunds = payment.refunds.reduce((s, r) => s + r.amount, 0);
      } else if (input.manualSaleId) {
        const sale = await tx.gymManualSale.findFirst({
          where: { id: input.manualSaleId, gymId: access.gymId },
          include: { refunds: { where: { cancelledAt: null } } },
        });
        if (!sale) {
          throw new AppError("NOT_FOUND", "수기 매출을 찾을 수 없습니다.");
        }
        if (sale.status === GymMemberPaymentStatus.cancelled) {
          throw new AppError(
            "VALIDATION_ERROR",
            "취소된 매출은 환불할 수 없습니다.",
          );
        }
        payableAmount = sale.amount;
        existingRefunds = sale.refunds.reduce((s, r) => s + r.amount, 0);
      }

      if (existingRefunds + input.amount > payableAmount) {
        throw new AppError(
          "VALIDATION_ERROR",
          "누적 환불금액이 결제금액을 초과할 수 없습니다.",
        );
      }

      const created = await tx.gymPaymentRefund.create({
        data: {
          gymId: access.gymId,
          paymentId: input.paymentId ?? null,
          manualSaleId: input.manualSaleId ?? null,
          amount: input.amount,
          refundedAt,
          refundMethod: input.refundMethod ?? GymMemberPaymentMethod.cash,
          reason: input.reason ?? null,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });

      const totalRefunded = existingRefunds + input.amount;
      if (input.paymentId && totalRefunded >= payableAmount) {
        await tx.gymMemberPayment.update({
          where: { id: input.paymentId },
          data: { status: GymMemberPaymentStatus.refunded },
        });
      }
      if (input.manualSaleId && totalRefunded >= payableAmount) {
        await tx.gymManualSale.update({
          where: { id: input.manualSaleId },
          data: { status: GymMemberPaymentStatus.refunded },
        });
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_payment_refund_created,
          targetType: "GymPaymentRefund",
          targetId: created.id,
          afterData: {
            amount: created.amount,
            paymentId: input.paymentId ?? null,
            manualSaleId: input.manualSaleId ?? null,
          },
        },
        tx,
      );
      return created;
    });
  },

  async createReceivable(
    actor: ActorContext,
    input: {
      gymMemberId: string;
      title: string;
      totalAmount: number;
      dueDate?: Date | string | null;
      category?: GymSalesCategory | null;
      subscriptionId?: string | null;
      productId?: string | null;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    assertPositiveInt(input.totalAmount, "청구금액");
    const member = await gymMemberRepository.findByIdForGym(
      input.gymMemberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const title = input.title.trim();
    if (!title) {
      throw new AppError("VALIDATION_ERROR", "결제 항목을 입력해 주세요.");
    }
    const dueDate = input.dueDate ? parsePaidAt(input.dueDate) : null;

    let productId: string | null = null;
    if (input.productId) {
      const product = await prisma.gymProduct.findFirst({
        where: {
          id: input.productId,
          gymId: access.gymId,
          deletedAt: null,
        },
      });
      if (!product) {
        throw new AppError("NOT_FOUND", "상품을 찾을 수 없습니다.");
      }
      productId = product.id;
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.gymReceivable.create({
        data: {
          gymId: access.gymId,
          gymMemberId: input.gymMemberId,
          productId,
          title,
          category: input.category ?? null,
          totalAmount: input.totalAmount,
          paidAmount: 0,
          dueDate,
          status: GymReceivableStatus.pending,
          subscriptionId: input.subscriptionId ?? null,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_receivable_created,
          targetType: "GymReceivable",
          targetId: created.id,
          afterData: { totalAmount: created.totalAmount, productId },
        },
        tx,
      );
      return created;
    });
  },

  /**
   * 통합 매출 등록.
   * - 결제금액 >= 판매금액 → GymManualSale (즉시 매출)
   * - 결제금액 < 판매금액 → GymReceivable (+ 일부 납부 시 Payment)
   * 미수/일부결제는 회원 필수 (기존 Receivable SSOT).
   */
  async createSalesEntry(
    actor: ActorContext,
    input: {
      title: string;
      saleAmount: number;
      paidAmount: number;
      soldAt?: Date | string;
      paymentMethod?: GymMemberPaymentMethod;
      category?: GymSalesCategory;
      gymMemberId?: string | null;
      productId?: string | null;
      memo?: string;
    },
  ): Promise<
    | { kind: "manual_sale"; id: string }
    | { kind: "receivable"; id: string; outstanding: number }
  > {
    const saleAmount = Math.trunc(input.saleAmount);
    const paidAmount = Math.trunc(input.paidAmount);
    if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
      throw new AppError("VALIDATION_ERROR", "판매금액을 입력해 주세요.");
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new AppError("VALIDATION_ERROR", "결제금액이 올바르지 않습니다.");
    }
    if (paidAmount > saleAmount) {
      throw new AppError(
        "VALIDATION_ERROR",
        "결제금액은 판매금액을 초과할 수 없습니다.",
      );
    }

    const title = input.title.trim();
    if (!title) {
      throw new AppError("VALIDATION_ERROR", "항목명을 입력해 주세요.");
    }

    if (paidAmount >= saleAmount) {
      const created = await this.createManualSale(actor, {
        title,
        amount: saleAmount,
        listPrice: saleAmount,
        soldAt: input.soldAt,
        paymentMethod: input.paymentMethod,
        category: input.category ?? GymSalesCategory.other,
        gymMemberId: input.gymMemberId,
        productId: input.productId,
        memo: input.memo,
      });
      return { kind: "manual_sale", id: created.id };
    }

    if (!input.gymMemberId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "미수·일부 결제는 회원을 선택해 주세요.",
      );
    }

    const receivable = await this.createReceivable(actor, {
      gymMemberId: input.gymMemberId,
      title,
      totalAmount: saleAmount,
      category: input.category ?? GymSalesCategory.other,
      productId: input.productId,
      memo: input.memo,
      dueDate: input.soldAt,
    });

    if (paidAmount > 0) {
      await this.collectReceivablePayment(actor, receivable.id, {
        amount: paidAmount,
        paidAt: input.soldAt,
        paymentMethod: input.paymentMethod,
        memo: input.memo,
      });
    }

    return {
      kind: "receivable",
      id: receivable.id,
      outstanding: Math.max(0, saleAmount - paidAmount),
    };
  },

  async listReceivables(actor: ActorContext) {
    const access = await requireGymPortalSalesManage(actor);
    const rows = await prisma.gymReceivable.findMany({
      where: { gymId: access.gymId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        member: { select: { name: true, phone: true } },
      },
    });

    const today = toSeoulAttendanceDate(new Date());
    return rows.map((r) => {
      const status = deriveReceivableStatus(r);
      const remaining = receivableRemaining(r.totalAmount, r.paidAmount);
      const due = r.dueDate ? toSeoulAttendanceDate(r.dueDate) : null;
      const overdueDays =
        due && remaining > 0 && due.getTime() < today.getTime()
          ? Math.floor((today.getTime() - due.getTime()) / 86_400_000)
          : 0;
      return {
        id: r.id,
        memberId: r.gymMemberId,
        memberName: r.member.name,
        maskedPhone: maskPhoneForAdminList(r.member.phone),
        title: r.title,
        totalAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        remaining,
        dueDate: r.dueDate,
        overdueDays,
        status,
        category: r.category,
        categoryLabel: salesCategoryLabel(r.category),
        memo: r.memo,
      };
    });
  },

  /**
   * 매출 등록 작업 목록 = 수기매출 + 미수(Receivable) 통합 ViewModel.
   * DB 변환 없이 표시만 합친다.
   */
  async listSalesEntries(
    actor: ActorContext,
    opts?: { paymentStatus?: "all" | "paid" | "partial" | "unpaid" },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const paymentStatus = opts?.paymentStatus ?? "all";
    const [manualSales, receivables] = await Promise.all([
      prisma.gymManualSale.findMany({
        where: { gymId: access.gymId, cancelledAt: null },
        orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
        include: {
          member: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true } },
        },
        take: 500,
      }),
      prisma.gymReceivable.findMany({
        where: {
          gymId: access.gymId,
          cancelledAt: null,
          status: { not: GymReceivableStatus.cancelled },
        },
        orderBy: [{ createdAt: "desc" }],
        include: {
          member: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true } },
        },
        take: 500,
      }),
    ]);

    const today = toSeoulAttendanceDate(new Date());

    type Entry = {
      id: string;
      kind: "manual_sale" | "receivable";
      soldAt: Date;
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

    const fromManual: Entry[] = manualSales.map((s) => ({
      id: s.id,
      kind: "manual_sale" as const,
      soldAt: s.soldAt,
      memberId: s.gymMemberId,
      memberName: s.member?.name ?? null,
      maskedPhone: s.member
        ? maskPhoneForAdminList(s.member.phone)
        : null,
      title: s.title,
      categoryLabel: salesCategoryLabel(s.category),
      productName: s.product?.name ?? null,
      saleAmount: s.amount,
      paidAmount: s.amount,
      remaining: 0,
      paymentStatus: "paid" as const,
      paymentStatusLabel: "결제 완료",
      overdueDays: 0,
    }));

    const fromReceivable: Entry[] = receivables.map((r) => {
      const remaining = receivableRemaining(r.totalAmount, r.paidAmount);
      const paymentStatus =
        remaining <= 0
          ? ("paid" as const)
          : r.paidAmount <= 0
            ? ("unpaid" as const)
            : ("partial" as const);
      const due = r.dueDate ? toSeoulAttendanceDate(r.dueDate) : null;
      const overdueDays =
        due && remaining > 0 && due.getTime() < today.getTime()
          ? Math.floor((today.getTime() - due.getTime()) / 86_400_000)
          : 0;
      return {
        id: r.id,
        kind: "receivable" as const,
        soldAt: r.dueDate ?? r.createdAt,
        memberId: r.gymMemberId,
        memberName: r.member.name,
        maskedPhone: maskPhoneForAdminList(r.member.phone),
        title: r.title,
        categoryLabel: salesCategoryLabel(r.category),
        productName: r.product?.name ?? null,
        saleAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        remaining,
        paymentStatus,
        paymentStatusLabel:
          paymentStatus === "paid"
            ? "결제 완료"
            : paymentStatus === "partial"
              ? "일부 결제"
              : "미수",
        overdueDays,
      };
    });

    const merged = [...fromManual, ...fromReceivable].sort(
      (a, b) => b.soldAt.getTime() - a.soldAt.getTime(),
    );

    if (paymentStatus === "all") return merged;
    return merged.filter((e) => e.paymentStatus === paymentStatus);
  },

  async collectReceivablePayment(
    actor: ActorContext,
    receivableId: string,
    input: {
      amount: number;
      paidAt?: Date | string;
      paymentMethod?: GymMemberPaymentMethod;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    assertPositiveInt(input.amount, "납부금액");
    const paidAt = parsePaidAt(input.paidAt ?? null);
    assertNotFutureSeoulDate(paidAt, "결제일");

    return prisma.$transaction(async (tx) => {
      const receivable = await tx.gymReceivable.findFirst({
        where: { id: receivableId, gymId: access.gymId },
      });
      if (!receivable) {
        throw new AppError("NOT_FOUND", "미수금을 찾을 수 없습니다.");
      }
      if (
        receivable.cancelledAt ||
        receivable.status === GymReceivableStatus.cancelled
      ) {
        throw new AppError("VALIDATION_ERROR", "취소된 미수금입니다.");
      }
      const remaining = receivableRemaining(
        receivable.totalAmount,
        receivable.paidAmount,
      );
      if (input.amount > remaining) {
        throw new AppError(
          "VALIDATION_ERROR",
          "납부금액이 남은 미수금을 초과할 수 없습니다.",
        );
      }

      const payment = await tx.gymMemberPayment.create({
        data: {
          gymId: access.gymId,
          gymMemberId: receivable.gymMemberId,
          subscriptionId: receivable.subscriptionId,
          receivableId: receivable.id,
          paidAt,
          amount: input.amount,
          listPrice: null,
          discountAmount: 0,
          paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
          status: GymMemberPaymentStatus.paid,
          category: receivable.category,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });

      const nextPaid = receivable.paidAmount + input.amount;
      const nextStatus =
        nextPaid >= receivable.totalAmount
          ? GymReceivableStatus.paid
          : GymReceivableStatus.partial;

      await tx.gymReceivable.update({
        where: { id: receivable.id },
        data: {
          paidAmount: nextPaid,
          status: nextStatus,
        },
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_receivable_payment_recorded,
          targetType: "GymReceivable",
          targetId: receivable.id,
          afterData: {
            paymentId: payment.id,
            amount: input.amount,
            paidAmount: nextPaid,
            status: nextStatus,
          },
        },
        tx,
      );

      return { payment, remaining: receivable.totalAmount - nextPaid };
    });
  },

  async cancelReceivable(
    actor: ActorContext,
    receivableId: string,
    memo?: string,
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const row = await prisma.gymReceivable.findFirst({
      where: { id: receivableId, gymId: access.gymId },
    });
    if (!row) throw new AppError("NOT_FOUND", "미수금을 찾을 수 없습니다.");

    await prisma.$transaction(async (tx) => {
      await tx.gymReceivable.update({
        where: { id: receivableId },
        data: {
          status: GymReceivableStatus.cancelled,
          cancelledAt: new Date(),
          memo: memo ?? row.memo,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_receivable_cancelled,
          targetType: "GymReceivable",
          targetId: receivableId,
          afterData: { totalAmount: row.totalAmount },
        },
        tx,
      );
    });
  },
};

export type GymSalesDashboard = Awaited<
  ReturnType<typeof gymSalesService.getDashboard>
>;
