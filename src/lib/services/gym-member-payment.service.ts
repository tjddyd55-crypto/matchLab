import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
} from "@/lib/enums";
import { toUtcDateOnly } from "@/lib/date-only";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";

export const gymMemberPaymentService = {
  async createPayment(
    actor: ActorContext,
    memberId: string,
    input: {
      amount: number;
      paidAt?: Date;
      paymentMethod?: GymMemberPaymentMethod;
      subscriptionId?: string;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    if (input.amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "금액은 0보다 커야 합니다.");
    }

    if (input.subscriptionId) {
      const ok = member.subscriptions.some((s) => s.id === input.subscriptionId);
      if (!ok) {
        throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.gymMemberPayment.create({
        data: {
          gymId: access.gymId,
          gymMemberId: memberId,
          subscriptionId: input.subscriptionId ?? null,
          paidAt: input.paidAt
            ? toUtcDateOnly(input.paidAt)
            : toUtcDateOnly(new Date()),
          amount: input.amount,
          paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
          status: GymMemberPaymentStatus.paid,
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
          afterData: { amount: created.amount, memberId },
        },
        tx,
      );
      return created;
    });

    return payment;
  },

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
      throw new AppError("VALIDATION_ERROR", "이미 취소된 납부입니다.");
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
          afterData: { memberId },
        },
        tx,
      );
    });
  },
};
