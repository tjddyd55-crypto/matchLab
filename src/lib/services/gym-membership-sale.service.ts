import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymMemberStatus,
  GymMemberSubscriptionCreationSource,
  GymMemberImportSourceRegistrationType,
  GymMemberSubscriptionStatus,
  GymReceivableStatus,
  GymSalesCategory,
} from "@/lib/enums";
import {
  formatUtcDateOnly,
  parseDateOnlyString,
  toUtcDateOnly,
} from "@/lib/date-only";
import { addMembershipDuration } from "@/lib/gym-member/membership-duration";
import { paymentMethodLabel } from "@/lib/gym-sales/calc";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";

function parsePaidAt(value?: Date | string | null): Date {
  if (!value) return toUtcDateOnly(new Date());
  if (typeof value === "string") {
    const d = parseDateOnlyString(value);
    if (!d) {
      throw new AppError("VALIDATION_ERROR", "결제일 형식이 올바르지 않습니다.");
    }
    return d;
  }
  return toUtcDateOnly(value);
}

function assertNonNegInt(n: number, label: string) {
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label}은(는) 0 이상 정수여야 합니다.`,
    );
  }
}

function buildPaymentMemo(
  discountReason?: string | null,
  memo?: string | null,
) {
  const parts: string[] = [];
  const reason = discountReason?.trim();
  const note = memo?.trim();
  if (reason) parts.push(`할인사유: ${reason}`);
  if (note) parts.push(note);
  return parts.length > 0 ? parts.join(" | ") : null;
}

export type MembershipTimelineItem = {
  id: string;
  at: Date;
  type:
    | "subscription_assign"
    | "subscription_extend"
    | "subscription_correct"
    | "subscription_cancel"
    | "pause"
    | "resume"
    | "payment"
    | "refund"
    | "receivable"
    | "collect";
  title: string;
  detail: string;
  actorLabel: string | null;
};

export type SubscriptionHistoryRow = {
  id: string;
  sequence: number;
  status: string;
  planName: string;
  sourceLabel: string;
  paidAt: Date | null;
  startedAt: Date;
  endsAt: Date | null;
  periodText: string | null;
  usedSessionsText: string | null;
  amount: number;
  isImport: boolean;
};

export type SubscriptionHistoryVM = {
  totalCount: number;
  matchonRenewalCount: number;
  rows: SubscriptionHistoryRow[];
};

export const gymMembershipSaleService = {
  /**
   * 이용권 적용 + 결제(+미수)를 단일 transaction으로 처리.
   */
  async sellMembership(
    actor: ActorContext,
    memberId: string,
    input: {
      planId: string;
      startedAt?: Date | string;
      endsAt?: Date | string | null;
      listPrice: number;
      discountAmount?: number;
      discountReason?: string | null;
      paidAmount: number;
      paidAt?: Date | string;
      paymentMethod?: GymMemberPaymentMethod;
      memo?: string | null;
      op?: "sell" | "renew";
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const plan = await prisma.gymMembershipPlan.findFirst({
      where: {
        id: input.planId,
        gymId: access.gymId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (!plan) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");

    const listPrice = Math.trunc(input.listPrice);
    const discountAmount = Math.trunc(input.discountAmount ?? 0);
    const paidAmount = Math.trunc(input.paidAmount);
    assertNonNegInt(listPrice, "정상가");
    assertNonNegInt(discountAmount, "할인금액");
    assertNonNegInt(paidAmount, "결제금액");
    if (discountAmount > listPrice) {
      throw new AppError("VALIDATION_ERROR", "할인금액이 정상가를 초과합니다.");
    }
    const saleAmount = listPrice - discountAmount;
    if (paidAmount > saleAmount) {
      throw new AppError(
        "VALIDATION_ERROR",
        "결제금액은 최종 판매금액을 초과할 수 없습니다.",
      );
    }

    const startedAt = input.startedAt
      ? typeof input.startedAt === "string"
        ? parseDateOnlyString(input.startedAt) ??
          (() => {
            throw new AppError(
              "VALIDATION_ERROR",
              "시작일 형식이 올바르지 않습니다.",
            );
          })()
        : toUtcDateOnly(input.startedAt)
      : toUtcDateOnly(new Date());

    let endsAt: Date | null =
      input.endsAt === undefined ||
      input.endsAt === null ||
      input.endsAt === ""
        ? null
        : typeof input.endsAt === "string"
          ? parseDateOnlyString(input.endsAt)
          : toUtcDateOnly(input.endsAt);
    if (input.endsAt && input.endsAt !== "" && !endsAt) {
      throw new AppError("VALIDATION_ERROR", "종료일 형식이 올바르지 않습니다.");
    }
    if (!endsAt) {
      endsAt = addMembershipDuration(
        startedAt,
        plan.durationType,
        plan.durationValue,
      );
    }

    const paidAt = parsePaidAt(input.paidAt ?? null);
    const paymentMemo = buildPaymentMemo(input.discountReason, input.memo);
    const op = input.op ?? "sell";

    return prisma.$transaction(async (tx) => {
      await tx.gymMemberSubscription.updateMany({
        where: {
          gymMemberId: memberId,
          status: {
            in: [
              GymMemberSubscriptionStatus.active,
              GymMemberSubscriptionStatus.paused,
            ],
          },
        },
        data: {
          status: GymMemberSubscriptionStatus.ended,
          cancelledAt: new Date(),
        },
      });

      const creationSource =
        op === "renew"
          ? GymMemberSubscriptionCreationSource.renew
          : GymMemberSubscriptionCreationSource.sell;

      const subscription = await tx.gymMemberSubscription.create({
        data: {
          gymId: access.gymId,
          gymMemberId: memberId,
          planId: plan.id,
          planNameSnapshot: plan.name,
          priceSnapshot: listPrice,
          startedAt,
          endsAt,
          status: GymMemberSubscriptionStatus.active,
          creationSource,
          memo: input.memo?.trim() || null,
          createdByUserId: actor.userId,
        },
      });

      if (member.status === GymMemberStatus.withdrawn) {
        await tx.gymMember.update({
          where: { id: memberId },
          data: { status: GymMemberStatus.active },
        });
      }

      let paymentId: string | null = null;
      let receivableId: string | null = null;
      const outstanding = Math.max(0, saleAmount - paidAmount);

      if (outstanding > 0) {
        const receivable = await tx.gymReceivable.create({
          data: {
            gymId: access.gymId,
            gymMemberId: memberId,
            title: plan.name,
            category: GymSalesCategory.membership,
            totalAmount: saleAmount,
            paidAmount,
            status:
              paidAmount > 0
                ? GymReceivableStatus.partial
                : GymReceivableStatus.pending,
            subscriptionId: subscription.id,
            memo: paymentMemo,
            createdByUserId: actor.userId,
          },
        });
        receivableId = receivable.id;

        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: AuditAction.gym_receivable_created,
            targetType: "GymReceivable",
            targetId: receivable.id,
            afterData: {
              totalAmount: saleAmount,
              paidAmount,
              subscriptionId: subscription.id,
              source: "membership_sale",
            },
          },
          tx,
        );

        if (paidAmount > 0) {
          const payment = await tx.gymMemberPayment.create({
            data: {
              gymId: access.gymId,
              gymMemberId: memberId,
              subscriptionId: subscription.id,
              receivableId: receivable.id,
              paidAt,
              amount: paidAmount,
              listPrice,
              discountAmount,
              paymentMethod:
                input.paymentMethod ?? GymMemberPaymentMethod.cash,
              status: GymMemberPaymentStatus.paid,
              category: GymSalesCategory.membership,
              memo: paymentMemo,
              createdByUserId: actor.userId,
            },
          });
          paymentId = payment.id;
          await auditRepository.createAuditLog(
            {
              actorUserId: actor.userId,
              action: AuditAction.gym_member_payment_created,
              targetType: "GymMemberPayment",
              targetId: payment.id,
              afterData: {
                amount: paidAmount,
                listPrice,
                discountAmount,
                subscriptionId: subscription.id,
                receivableId: receivable.id,
              },
            },
            tx,
          );
        }
      } else if (saleAmount > 0) {
        const payment = await tx.gymMemberPayment.create({
          data: {
            gymId: access.gymId,
            gymMemberId: memberId,
            subscriptionId: subscription.id,
            paidAt,
            amount: saleAmount,
            listPrice,
            discountAmount,
            paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
            status: GymMemberPaymentStatus.paid,
            category: GymSalesCategory.membership,
            memo: paymentMemo,
            createdByUserId: actor.userId,
          },
        });
        paymentId = payment.id;
        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: AuditAction.gym_member_payment_created,
            targetType: "GymMemberPayment",
            targetId: payment.id,
            afterData: {
              amount: saleAmount,
              listPrice,
              discountAmount,
              subscriptionId: subscription.id,
            },
          },
          tx,
        );
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_subscription_changed,
          targetType: "GymMemberSubscription",
          targetId: subscription.id,
          afterData: {
            op,
            memberId,
            planName: plan.name,
            listPrice,
            discountAmount,
            saleAmount,
            paidAmount,
            outstanding,
            paymentId,
            receivableId,
          },
        },
        tx,
      );

      return {
        subscriptionId: subscription.id,
        paymentId,
        receivableId,
        saleAmount,
        paidAmount,
        outstanding,
      };
    });
  },

  async correctSubscription(
    actor: ActorContext,
    memberId: string,
    subscriptionId: string,
    input: {
      startedAt?: Date | string;
      endsAt?: Date | string | null;
      memo?: string | null;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const sub = member.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");

    const before = {
      startedAt: sub.startedAt.toISOString(),
      endsAt: sub.endsAt?.toISOString() ?? null,
      memo: sub.memo,
    };

    const startedAt = input.startedAt
      ? typeof input.startedAt === "string"
        ? parseDateOnlyString(input.startedAt)
        : toUtcDateOnly(input.startedAt)
      : sub.startedAt;
    if (!startedAt) {
      throw new AppError("VALIDATION_ERROR", "시작일 형식이 올바르지 않습니다.");
    }

    let endsAt: Date | null = sub.endsAt;
    if (input.endsAt !== undefined) {
      if (input.endsAt === null || input.endsAt === "") {
        endsAt = null;
      } else {
        endsAt =
          typeof input.endsAt === "string"
            ? parseDateOnlyString(input.endsAt)
            : toUtcDateOnly(input.endsAt);
        if (!endsAt) {
          throw new AppError(
            "VALIDATION_ERROR",
            "종료일 형식이 올바르지 않습니다.",
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.gymMemberSubscription.update({
        where: { id: subscriptionId },
        data: {
          startedAt,
          endsAt,
          memo:
            input.memo !== undefined ? input.memo?.trim() || null : sub.memo,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_subscription_changed,
          targetType: "GymMemberSubscription",
          targetId: subscriptionId,
          beforeData: before,
          afterData: {
            op: "correct",
            startedAt: startedAt.toISOString(),
            endsAt: endsAt?.toISOString() ?? null,
            memo:
              input.memo !== undefined ? input.memo?.trim() || null : sub.memo,
          },
        },
        tx,
      );
    });
  },

  async cancelSubscription(
    actor: ActorContext,
    memberId: string,
    subscriptionId: string,
    memo?: string,
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const sub = member.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
    if (sub.status === GymMemberSubscriptionStatus.cancelled) {
      throw new AppError("VALIDATION_ERROR", "이미 취소된 이용권입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.gymMemberSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: GymMemberSubscriptionStatus.cancelled,
          cancelledAt: new Date(),
          memo: memo?.trim() || sub.memo,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_subscription_changed,
          targetType: "GymMemberSubscription",
          targetId: subscriptionId,
          afterData: { op: "cancel", memberId },
        },
        tx,
      );
    });
  },

  async getSubscriptionMoneySummary(
    actor: ActorContext,
    memberId: string,
    subscriptionId: string,
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const sub = member.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");

    const [payments, receivables, refunds] = await Promise.all([
      prisma.gymMemberPayment.findMany({
        where: {
          gymId: access.gymId,
          gymMemberId: memberId,
          subscriptionId,
          status: {
            in: [
              GymMemberPaymentStatus.paid,
              GymMemberPaymentStatus.refunded,
            ],
          },
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.gymReceivable.findMany({
        where: {
          gymId: access.gymId,
          gymMemberId: memberId,
          subscriptionId,
          cancelledAt: null,
        },
      }),
      prisma.gymPaymentRefund.findMany({
        where: {
          gymId: access.gymId,
          cancelledAt: null,
          payment: { gymMemberId: memberId, subscriptionId },
        },
      }),
    ]);

    const listPrice =
      payments.find((p) => p.listPrice != null)?.listPrice ??
      sub.priceSnapshot;
    const discountAmount = payments.reduce((s, p) => s + p.discountAmount, 0);
    const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
    const refundTotal = refunds.reduce((s, r) => s + r.amount, 0);
    const receivableOutstanding = receivables.reduce((s, r) => {
      if (r.status === GymReceivableStatus.cancelled) return s;
      return s + Math.max(0, r.totalAmount - r.paidAmount);
    }, 0);
    const saleAmountFromReceivable = receivables[0]?.totalAmount;
    const saleAmount =
      saleAmountFromReceivable ??
      (listPrice != null
        ? Math.max(0, listPrice - discountAmount)
        : paidAmount);

    return {
      listPrice: listPrice ?? 0,
      discountAmount,
      saleAmount,
      paidAmount,
      refundTotal,
      outstanding: receivableOutstanding,
      primaryReceivableId:
        receivables.find((r) => r.totalAmount - r.paidAmount > 0)?.id ?? null,
      primaryPaymentId: payments[0]?.id ?? null,
    };
  },

  async buildTimeline(
    actor: ActorContext,
    memberId: string,
  ): Promise<MembershipTimelineItem[]> {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const subIds = member.subscriptions.map((s) => s.id);
    const [payments, refunds, receivables, pauses, audits] = await Promise.all([
      prisma.gymMemberPayment.findMany({
        where: { gymId: access.gymId, gymMemberId: memberId },
        orderBy: { paidAt: "desc" },
        take: 100,
      }),
      prisma.gymPaymentRefund.findMany({
        where: {
          gymId: access.gymId,
          cancelledAt: null,
          payment: { gymMemberId: memberId },
        },
        take: 50,
      }),
      prisma.gymReceivable.findMany({
        where: { gymId: access.gymId, gymMemberId: memberId },
        take: 50,
      }),
      subIds.length
        ? prisma.gymMemberSubscriptionPause.findMany({
            where: { subscriptionId: { in: subIds } },
          })
        : Promise.resolve([]),
      prisma.auditLog.findMany({
        where: {
          OR: [
            {
              targetType: "GymMemberSubscription",
              targetId: { in: subIds.length ? subIds : ["__none__"] },
            },
            {
              targetType: "GymMember",
              targetId: memberId,
              action: {
                in: [
                  AuditAction.gym_member_paused,
                  AuditAction.gym_member_resumed,
                ],
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const items: MembershipTimelineItem[] = [];

    for (const s of member.subscriptions) {
      items.push({
        id: `sub-assign-${s.id}`,
        at: s.createdAt,
        type: "subscription_assign",
        title: "이용권 등록",
        detail: `${s.planNameSnapshot} · ${formatUtcDateOnly(s.startedAt)}${
          s.endsAt ? ` ~ ${formatUtcDateOnly(s.endsAt)}` : ""
        }`,
        actorLabel: null,
      });
    }

    for (const p of payments) {
      if (p.status === GymMemberPaymentStatus.cancelled) continue;
      items.push({
        id: `pay-${p.id}`,
        at: p.paidAt,
        type: p.receivableId ? "collect" : "payment",
        title: p.receivableId ? "추가 수납" : "결제",
        detail: `${paymentMethodLabel(p.paymentMethod)} · ${p.amount.toLocaleString("ko-KR")}원${
          p.discountAmount > 0
            ? ` · 할인 ${p.discountAmount.toLocaleString("ko-KR")}원`
            : ""
        }`,
        actorLabel: null,
      });
    }

    for (const r of refunds) {
      items.push({
        id: `refund-${r.id}`,
        at: r.refundedAt,
        type: "refund",
        title: "환불",
        detail: `${r.amount.toLocaleString("ko-KR")}원${
          r.reason ? ` · ${r.reason}` : ""
        }`,
        actorLabel: null,
      });
    }

    for (const r of receivables) {
      items.push({
        id: `recv-${r.id}`,
        at: r.createdAt,
        type: "receivable",
        title: "미수 등록",
        detail: `${r.title} · ${r.totalAmount.toLocaleString("ko-KR")}원 (납부 ${r.paidAmount.toLocaleString("ko-KR")})`,
        actorLabel: null,
      });
    }

    for (const pause of pauses) {
      items.push({
        id: `pause-${pause.id}`,
        at: pause.pausedAt,
        type: "pause",
        title: "휴회",
        detail: pause.reason ?? (pause.extendEndsAt ? "종료일 연장" : "휴회"),
        actorLabel: null,
      });
      if (pause.resumedAt) {
        items.push({
          id: `resume-${pause.id}`,
          at: pause.resumedAt,
          type: "resume",
          title: "휴회 해제",
          detail: "",
          actorLabel: null,
        });
      }
    }

    for (const a of audits) {
      const after = (a.afterData ?? {}) as Record<string, unknown>;
      const op = typeof after.op === "string" ? after.op : "";
      if (op === "extend") {
        items.push({
          id: `audit-ext-${a.id}`,
          at: a.createdAt,
          type: "subscription_extend",
          title: "연기",
          detail:
            typeof after.extendDays === "number"
              ? `${after.extendDays}일`
              : "",
          actorLabel: null,
        });
      } else if (op === "correct") {
        const before = (a.beforeData ?? {}) as Record<string, unknown>;
        items.push({
          id: `audit-cor-${a.id}`,
          at: a.createdAt,
          type: "subscription_correct",
          title: "정정",
          detail: `종료일 ${String(before.endsAt ?? "—")} → ${String(after.endsAt ?? "—")}`,
          actorLabel: null,
        });
      } else if (op === "cancel") {
        items.push({
          id: `audit-can-${a.id}`,
          at: a.createdAt,
          type: "subscription_cancel",
          title: "이용권 취소",
          detail: "",
          actorLabel: null,
        });
      }
    }

    items.sort((a, b) => b.at.getTime() - a.at.getTime());
    return items;
  },

  async listSubscriptionHistory(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const subs = await prisma.gymMemberSubscription.findMany({
      where: {
        gymMemberId: memberId,
        gymId: access.gymId,
        status: { not: GymMemberSubscriptionStatus.cancelled },
      },
      orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      include: {
        payments: {
          where: { cancelledAt: null },
          orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });

    const matchonRenewalCount = subs.filter(
      (s) => s.creationSource === GymMemberSubscriptionCreationSource.renew,
    ).length;

    const rows = subs.map((s, idx) => {
      const meta = (s.importMeta ?? {}) as Record<string, unknown>;
      const sourceLabel =
        s.sourceRegistrationType ===
        GymMemberImportSourceRegistrationType.renewal
          ? "재등록(가져오기)"
          : s.sourceRegistrationType ===
              GymMemberImportSourceRegistrationType.new_member
            ? "신규(가져오기)"
            : s.creationSource === GymMemberSubscriptionCreationSource.renew
              ? "재등록"
              : s.creationSource ===
                  GymMemberSubscriptionCreationSource.excel_import
                ? "가져오기"
                : "등록";
      return {
        id: s.id,
        sequence: idx + 1,
        status: s.status,
        planName: s.planNameSnapshot,
        sourceLabel,
        creationSource: s.creationSource,
        paidAt: s.payments[0]?.paidAt ?? null,
        startedAt: s.startedAt,
        endsAt: s.endsAt,
        periodText:
          typeof meta.periodText === "string" ? meta.periodText : null,
        usedSessionsText:
          typeof meta.usedSessionsText === "string"
            ? meta.usedSessionsText
            : null,
        amount: s.payments[0]?.amount ?? s.priceSnapshot,
        isImport:
          s.creationSource ===
          GymMemberSubscriptionCreationSource.excel_import,
      };
    });

    return {
      totalCount: rows.length,
      matchonRenewalCount,
      rows: [...rows].reverse(),
    };
  },
};
