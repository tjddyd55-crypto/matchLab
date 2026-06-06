import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { PaymentStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { AppError } from "@/lib/errors/app-error";
import { applicationRepository } from "@/lib/repositories/application.repository";
import {
  paymentRepository,
  type PaymentOwnershipContext,
} from "@/lib/repositories/payment.repository";
import { safeNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";

function dispatchPaymentNotification(
  eventId: string,
  gymId: string,
  paymentStatus: PaymentStatus,
): void {
  safeNotify(`payment:${eventId}:${paymentStatus}`, async () => {
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { ownerUserId: true },
    });
    const ev = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    if (!gym?.ownerUserId || !ev) return;
    await notificationService.notifyPaymentStatusChanged({
      eventId,
      eventTitle: ev.title,
      gymOwnerUserId: gym.ownerUserId,
      paymentStatus,
    });
  });
}

async function loadPaymentContextOrThrow(
  paymentId: string,
): Promise<PaymentOwnershipContext> {
  const ctx = await paymentRepository.findPaymentOwnershipContext(paymentId);
  if (!ctx) {
    throw new AppError("NOT_FOUND", "결제 정보를 찾을 수 없습니다.");
  }
  return ctx;
}

async function assertOrganizerManagesPayment(
  actor: ActorContext,
  ctx: PaymentOwnershipContext,
): Promise<void> {
  await requireOrganizerForEvent(actor, ctx.eventId);
}

/**
 * Payment 행 갱신 후 Application.paymentStatus 캐시를 같은 트랜잭션에서 동기화한다.
 * 고위험 전이(예: paid → refunded)는 추후 AuditLog 와 함께 기록할 것 — TODO.
 *
 * React Query 도입 시 무효화:
 * - `['events', eventId, 'applications']`
 * - `['gyms', gymId, 'applications']`
 * (`docs/query-keys.md` §3.3)
 */
export const paymentService = {
  async confirmBankPayment(
    actor: ActorContext,
    input: { paymentId: string; depositorName?: string; memo?: string },
  ): Promise<void> {
    const ctx = await loadPaymentContextOrThrow(input.paymentId);
    await assertOrganizerManagesPayment(actor, ctx);

    const payment = await paymentRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 정보를 찾을 수 없습니다.");
    }

    if (
      payment.paymentStatus !== PaymentStatus.unpaid &&
      payment.paymentStatus !== PaymentStatus.pending_check
    ) {
      throw new AppError(
        "CONFLICT",
        "입금 확인은 미입금 또는 확인 중 상태에서만 가능합니다.",
      );
    }

    const depositorName =
      input.depositorName?.trim() ||
      payment.depositorName?.trim() ||
      null;

    const memo =
      input.memo !== undefined ? input.memo : payment.memo ?? null;

    await prisma.$transaction(async (tx) => {
      await paymentRepository.updateApplicationPaymentStatus(
        input.paymentId,
        {
          paymentStatus: PaymentStatus.paid,
          depositorName,
          confirmedByUserId: actor.userId,
          confirmedAt: new Date(),
          memo,
        },
        tx,
      );
      await applicationRepository.updateApplicationPaymentStatusCache(
        ctx.applicationId,
        PaymentStatus.paid,
        tx,
      );
    });

    dispatchPaymentNotification(ctx.eventId, ctx.gymId, PaymentStatus.paid);
  },

  async markPaymentPendingCheck(
    actor: ActorContext,
    input: { paymentId: string; memo?: string },
  ): Promise<void> {
    const ctx = await loadPaymentContextOrThrow(input.paymentId);
    await assertOrganizerManagesPayment(actor, ctx);

    const payment = await paymentRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 정보를 찾을 수 없습니다.");
    }
    if (payment.paymentStatus !== PaymentStatus.unpaid) {
      throw new AppError(
        "CONFLICT",
        "확인 필요 상태로 바꿀 수 있는 경우는 미입금 상태뿐입니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await paymentRepository.updateApplicationPaymentStatus(
        input.paymentId,
        {
          paymentStatus: PaymentStatus.pending_check,
          ...(input.memo !== undefined ? { memo: input.memo } : {}),
        },
        tx,
      );
      await applicationRepository.updateApplicationPaymentStatusCache(
        ctx.applicationId,
        PaymentStatus.pending_check,
        tx,
      );
    });

    dispatchPaymentNotification(
      ctx.eventId,
      ctx.gymId,
      PaymentStatus.pending_check,
    );
  },

  async markPaymentRefunded(
    actor: ActorContext,
    input: { paymentId: string; memo?: string },
  ): Promise<void> {
    const ctx = await loadPaymentContextOrThrow(input.paymentId);
    await assertOrganizerManagesPayment(actor, ctx);

    const payment = await paymentRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 정보를 찾을 수 없습니다.");
    }
    if (payment.paymentStatus !== PaymentStatus.paid) {
      throw new AppError(
        "CONFLICT",
        "환불 처리는 입금 완료 상태에서만 가능합니다.",
      );
    }

    // TODO(AuditLog): paid → refunded 고위험 전이 기록

    await prisma.$transaction(async (tx) => {
      await paymentRepository.updateApplicationPaymentStatus(
        input.paymentId,
        {
          paymentStatus: PaymentStatus.refunded,
          ...(input.memo !== undefined ? { memo: input.memo } : {}),
        },
        tx,
      );
      await applicationRepository.updateApplicationPaymentStatusCache(
        ctx.applicationId,
        PaymentStatus.refunded,
        tx,
      );
    });

    dispatchPaymentNotification(ctx.eventId, ctx.gymId, PaymentStatus.refunded);
  },

  async markPaymentWaived(
    actor: ActorContext,
    input: { paymentId: string; memo?: string },
  ): Promise<void> {
    const ctx = await loadPaymentContextOrThrow(input.paymentId);
    await assertOrganizerManagesPayment(actor, ctx);

    const payment = await paymentRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new AppError("NOT_FOUND", "결제 정보를 찾을 수 없습니다.");
    }
    if (payment.paymentStatus === PaymentStatus.refunded) {
      throw new AppError(
        "CONFLICT",
        "환불 처리된 건은 참가비 면제로 변경할 수 없습니다.",
      );
    }
    if (payment.paymentStatus === PaymentStatus.waived) {
      return;
    }

    // TODO(AuditLog): 면제 처리 기록

    await prisma.$transaction(async (tx) => {
      await paymentRepository.updateApplicationPaymentStatus(
        input.paymentId,
        {
          paymentStatus: PaymentStatus.waived,
          ...(input.memo !== undefined ? { memo: input.memo } : {}),
        },
        tx,
      );
      await applicationRepository.updateApplicationPaymentStatusCache(
        ctx.applicationId,
        PaymentStatus.waived,
        tx,
      );
    });

    dispatchPaymentNotification(ctx.eventId, ctx.gymId, PaymentStatus.waived);
  },
};
