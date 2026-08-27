import "server-only";

import { randomBytes } from "crypto";
import {
  CreditPaymentStatus,
  type Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  getChargePlanById,
  getCreditChargePlans,
} from "@/lib/credits/credit-policy";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { creditPaymentRepository } from "@/lib/repositories/credit-payment.repository";
import { billingCreditService } from "@/lib/services/billing-credit.service";
import {
  BillingLedgerType,
  BillingReferenceType,
  BillingServiceType,
} from "@/generated/prisma";

function generateOrderId(): string {
  return `credit_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

function isDevPaymentConfirmAllowed(actor: ActorContext): boolean {
  if (actor.role === "admin") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_DEV_CREDIT_PAYMENT_CONFIRM === "true";
}

async function chargeWalletFromPayment(
  organizerId: string,
  credits: number,
  paymentId: string,
  orderId: string,
  actorUserId: string | null,
  tx: Prisma.TransactionClient,
) {
  const result = await billingCreditService.creditOrganizer({
    organizerId,
    amount: credits,
    type: BillingLedgerType.payment_charge,
    serviceType: BillingServiceType.admin,
    reason: "크레딧 결제 충전",
    idempotencyKey: `organizer_credit_payment:${paymentId}:charge`,
    actorUserId,
    referenceType: BillingReferenceType.organizer_credit_payment,
    referenceId: paymentId,
    metadata: { orderId, paymentId },
    existingTx: tx,
  });

  return result.ledgerId;
}

export const creditPaymentService = {
  getCreditChargePlans,

  async createCreditPaymentOrder(input: {
    organizerId: string;
    planId: string;
    actor: ActorContext;
  }) {
    requireRole(input.actor, ["organizer", "admin"]);
    if (input.actor.role === "organizer") {
      if (input.actor.organizerId !== input.organizerId) {
        throw new AppError("FORBIDDEN", "본인 주최자 계정만 결제할 수 있습니다.");
      }
    }

    const plan = getChargePlanById(input.planId);
    if (!plan) {
      throw new AppError("VALIDATION_ERROR", "충전 상품을 찾을 수 없습니다.");
    }

    const orderId = generateOrderId();
    const payment = await creditPaymentRepository.createPayment({
      organizerId: input.organizerId,
      userId: input.actor.userId,
      orderId,
      amountKrw: plan.amountKrw,
      credits: plan.credits,
    });

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amountKrw: payment.amountKrw,
      credits: payment.credits,
      status: payment.status,
      pgReady: false as const,
    };
  },

  async markCreditPaymentPaid(input: {
    orderId: string;
    paymentKey?: string;
    actor?: ActorContext | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await creditPaymentRepository.findByOrderId(
        input.orderId,
        tx,
      );
      if (!payment) {
        throw new AppError("NOT_FOUND", "결제 주문을 찾을 수 없습니다.");
      }

      if (payment.status === CreditPaymentStatus.paid) {
        return {
          idempotent: true as const,
          paymentId: payment.id,
          ledgerId: payment.ledgerId,
        };
      }

      if (payment.status !== CreditPaymentStatus.pending) {
        throw new AppError(
          "CONFLICT",
          "처리할 수 없는 결제 상태입니다.",
        );
      }

      const ledgerId = await chargeWalletFromPayment(
        payment.organizerId,
        payment.credits,
        payment.id,
        payment.orderId,
        input.actor?.userId ?? payment.userId,
        tx,
      );

      const approvedAt = new Date();
      await creditPaymentRepository.markPaid(
        payment.orderId,
        {
          paymentKey: input.paymentKey ?? null,
          ledgerId,
          approvedAt,
        },
        tx,
      );

      return {
        idempotent: false as const,
        paymentId: payment.id,
        ledgerId,
        credits: payment.credits,
      };
    });
  },

  async markCreditPaymentFailed(input: {
    orderId: string;
    reason?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await creditPaymentRepository.findByOrderId(
        input.orderId,
        tx,
      );
      if (!payment) {
        throw new AppError("NOT_FOUND", "결제 주문을 찾을 수 없습니다.");
      }
      if (payment.status !== CreditPaymentStatus.pending) {
        return { skipped: true as const };
      }
      await creditPaymentRepository.markFailed(
        input.orderId,
        new Date(),
        input.reason ?? null,
        tx,
      );
      return { skipped: false as const };
    });
  },

  async cancelCreditPayment(input: {
    orderId: string;
    actor: ActorContext;
  }) {
    requireRole(input.actor, ["organizer", "admin"]);
    const payment = await creditPaymentRepository.findByOrderId(input.orderId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 주문을 찾을 수 없습니다.");
    }
    if (
      input.actor.role === "organizer" &&
      input.actor.organizerId !== payment.organizerId
    ) {
      throw new AppError("FORBIDDEN", "본인 결제만 취소할 수 있습니다.");
    }
    if (payment.status !== CreditPaymentStatus.pending) {
      throw new AppError("CONFLICT", "대기 중인 주문만 취소할 수 있습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await creditPaymentRepository.markCancelled(
        input.orderId,
        new Date(),
        tx,
      );
    });
  },

  async confirmPaymentForOrganizerDev(input: {
    orderId: string;
    actor: ActorContext;
  }) {
    if (!isDevPaymentConfirmAllowed(input.actor)) {
      throw new AppError(
        "FORBIDDEN",
        "결제 확인 권한이 없습니다. PG 연동 후 이용해 주세요.",
      );
    }

    const payment = await creditPaymentRepository.findByOrderId(input.orderId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 주문을 찾을 수 없습니다.");
    }
    if (
      input.actor.role === "organizer" &&
      input.actor.organizerId !== payment.organizerId
    ) {
      throw new AppError("FORBIDDEN", "본인 결제만 확인할 수 있습니다.");
    }

    return this.markCreditPaymentPaid({
      orderId: input.orderId,
      paymentKey: `dev_${input.orderId}`,
      actor: input.actor,
    });
  },

  async listOrganizerPayments(organizerId: string) {
    return creditPaymentRepository.listByOrganizerId(organizerId);
  },

  isDevPaymentConfirmAllowed,
};
