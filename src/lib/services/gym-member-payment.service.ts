/**
 * 회원 결제 서비스 — 매출 SSOT의 MEMBER_PAYMENT 축.
 * 취소(입력 취소)와 환불(돈 반환)을 분리한다. 환불은 gymSalesService.createRefund.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymSalesCategory,
} from "@/lib/enums";
import { parseDateOnlyString } from "@/lib/date-only";
import { toSeoulAttendanceDate } from "@/lib/gym-attendance/seoul-date";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";

function parsePaidAt(value?: Date | string | null): Date {
  if (!value) return toSeoulAttendanceDate(new Date());
  if (typeof value === "string") {
    const d = parseDateOnlyString(value);
    if (!d) {
      throw new AppError(
        "VALIDATION_ERROR",
        "결제일 형식이 올바르지 않습니다.",
      );
    }
    return d;
  }
  return toSeoulAttendanceDate(value);
}

export const gymMemberPaymentService = {
  async createPayment(
    actor: ActorContext,
    memberId: string,
    input: {
      amount: number;
      paidAt?: Date | string;
      paymentMethod?: GymMemberPaymentMethod;
      subscriptionId?: string;
      memo?: string;
      listPrice?: number | null;
      discountAmount?: number;
      category?: GymSalesCategory | null;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    if (!Number.isInteger(input.amount) || input.amount < 0) {
      throw new AppError("VALIDATION_ERROR", "금액은 0 이상 정수여야 합니다.");
    }
    const discount = input.discountAmount ?? 0;
    if (!Number.isInteger(discount) || discount < 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "할인금액은 0 이상 정수여야 합니다.",
      );
    }
    if (input.listPrice != null) {
      if (!Number.isInteger(input.listPrice) || input.listPrice < 0) {
        throw new AppError("VALIDATION_ERROR", "정가는 0 이상 정수여야 합니다.");
      }
      if (discount > input.listPrice) {
        throw new AppError(
          "VALIDATION_ERROR",
          "할인금액이 정가를 초과합니다.",
        );
      }
    }

    if (input.subscriptionId) {
      const ok = member.subscriptions.some((s) => s.id === input.subscriptionId);
      if (!ok) {
        throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
      }
    }

    const paidAt = parsePaidAt(input.paidAt ?? null);
    const today = toSeoulAttendanceDate(new Date());
    if (paidAt.getTime() > today.getTime()) {
      throw new AppError("VALIDATION_ERROR", "결제일은 미래일 수 없습니다.");
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.gymMemberPayment.create({
        data: {
          gymId: access.gymId,
          gymMemberId: memberId,
          subscriptionId: input.subscriptionId ?? null,
          paidAt,
          amount: input.amount,
          listPrice: input.listPrice ?? null,
          discountAmount: discount,
          paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.card,
          status: GymMemberPaymentStatus.paid,
          category:
            input.category ??
            (input.subscriptionId ? GymSalesCategory.membership : null),
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_payment_created,
          targetType: "GymMemberPayment",
          targetId: created.id,
          afterData: {
            amount: created.amount,
            discountAmount: created.discountAmount,
            listPrice: created.listPrice,
            memberId,
            category: created.category,
          },
        },
        tx,
      );
      return created;
    });

    return payment;
  },

  /**
   * 결제 취소 — 실제 돈이 오가지 않은 입력 취소.
   * 환불과 다름. hard delete 금지.
   */
  async cancelPayment(
    actor: ActorContext,
    memberId: string,
    paymentId: string,
    memo?: string,
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const payment = member.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "납부 내역을 찾을 수 없습니다.");
    }
    if (payment.status !== GymMemberPaymentStatus.paid) {
      throw new AppError("VALIDATION_ERROR", "취소할 수 없는 납부 상태입니다.");
    }

    const refundCount = await prisma.gymPaymentRefund.count({
      where: { paymentId, cancelledAt: null },
    });
    if (refundCount > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "환불이 있는 결제는 취소할 수 없습니다. 환불로 처리하세요.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.gymMemberPayment.update({
        where: { id: paymentId },
        data: {
          status: GymMemberPaymentStatus.cancelled,
          cancelledAt: new Date(),
          memo: memo ?? payment.memo,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_payment_cancelled,
          targetType: "GymMemberPayment",
          targetId: paymentId,
          afterData: { memberId, amount: payment.amount },
        },
        tx,
      );
    });
  },
};
