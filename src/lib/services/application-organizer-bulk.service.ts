import "server-only";

import type { BulkApplicationActionResult } from "@/lib/bulk-application-result-feedback";
import {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { applicationService } from "@/lib/services/application.service";
import { paymentService } from "@/lib/services/payment.service";

export type BulkApplicationAction =
  | "confirm_payment_approve"
  | "organizer_cancel"
  | "mark_gym_cancelled";

export type BulkApplicationResult = BulkApplicationActionResult;

export const applicationOrganizerBulkService = {
  async bulkByApplicationIds(
    actor: ActorContext,
    eventId: string,
    applicationIds: string[],
    action: BulkApplicationAction,
  ): Promise<BulkApplicationResult> {
    await requireOrganizerForEvent(actor, eventId);
    const uniqueIds = [...new Set(applicationIds)];
    const result: BulkApplicationResult = {
      successCount: 0,
      failureCount: 0,
      failures: [],
    };

    for (const applicationId of uniqueIds) {
      try {
        await applicationOrganizerBulkService.applySingle(
          actor,
          eventId,
          applicationId,
          action,
        );
        result.successCount += 1;
      } catch (e) {
        result.failureCount += 1;
        result.failures.push({
          applicationId,
          reason:
            e instanceof AppError
              ? e.message
              : e instanceof Error
                ? e.message
                : "처리 실패",
        });
      }
    }

    return result;
  },

  async bulkByGym(
    actor: ActorContext,
    eventId: string,
    gymId: string,
    action: BulkApplicationAction,
    filter?: { applicationIds?: string[] },
  ): Promise<BulkApplicationResult> {
    const rows =
      await applicationRepository.listApplicationsForOrganizerEvent(eventId);
    const gymRows = rows.filter((r) => r.gym?.id === gymId);
    const ids =
      filter?.applicationIds?.length
        ? gymRows
            .filter((r) => filter.applicationIds!.includes(r.id))
            .map((r) => r.id)
        : gymRows.map((r) => r.id);
    return applicationOrganizerBulkService.bulkByApplicationIds(
      actor,
      eventId,
      ids,
      action,
    );
  },

  async applySingle(
    actor: ActorContext,
    eventId: string,
    applicationId: string,
    action: BulkApplicationAction,
  ): Promise<void> {
    const ctx =
      await applicationRepository.findApplicationOwnershipContext(applicationId);
    if (!ctx || ctx.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    switch (action) {
      case "confirm_payment_approve":
        await applicationOrganizerBulkService.confirmPaymentAndApprove(
          actor,
          applicationId,
          ctx,
        );
        break;
      case "organizer_cancel":
        await applicationOrganizerBulkService.organizerCancel(
          actor,
          applicationId,
          ctx,
        );
        break;
      case "mark_gym_cancelled":
        await applicationOrganizerBulkService.markGymCancelled(
          actor,
          applicationId,
          ctx,
        );
        break;
      default:
        throw new AppError("VALIDATION_ERROR", "지원하지 않는 처리입니다.");
    }
  },

  async confirmPaymentAndApprove(
    actor: ActorContext,
    applicationId: string,
    ctx: NonNullable<
      Awaited<ReturnType<typeof applicationRepository.findApplicationOwnershipContext>>
    >,
  ): Promise<void> {
    if (
      ctx.status === ApplicationStatus.cancelled ||
      ctx.status === ApplicationStatus.rejected
    ) {
      throw new AppError("CONFLICT", "취소된 신청은 승인할 수 없습니다.");
    }

    const payment = ctx.payments?.[0];
    const paymentAlreadyPaid =
      ctx.paymentStatus === PaymentStatus.paid ||
      ctx.paymentStatus === PaymentStatus.waived ||
      payment?.paymentStatus === PaymentStatus.paid ||
      payment?.paymentStatus === PaymentStatus.waived;

    if (payment && !paymentAlreadyPaid) {
      await paymentService.confirmBankPayment(actor, { paymentId: payment.id });
    } else if (!paymentAlreadyPaid) {
      await applicationRepository.updateApplicationPaymentStatusCache(
        applicationId,
        PaymentStatus.paid,
      );
    }

    if (ctx.status === ApplicationStatus.pending) {
      await applicationService.approveEventApplication(actor, applicationId);
    }
  },

  async organizerCancel(
    actor: ActorContext,
    applicationId: string,
    ctx: NonNullable<
      Awaited<ReturnType<typeof applicationRepository.findApplicationOwnershipContext>>
    >,
  ): Promise<void> {
    if (ctx.status === ApplicationStatus.rejected) return;
    if (ctx.status === ApplicationStatus.pending) {
      await applicationService.rejectEventApplication(
        actor,
        applicationId,
        "주최측 취소",
      );
      await applicationRepository.patchApplication(applicationId, {
        cancellationSource: ApplicationCancellationSource.organizer,
      });
      return;
    }
    if (ctx.status === ApplicationStatus.approved) {
      await applicationService.rejectEventApplication(
        actor,
        applicationId,
        "주최측 취소",
      );
      await applicationRepository.patchApplication(applicationId, {
        cancellationSource: ApplicationCancellationSource.organizer,
      });
      return;
    }
    throw new AppError("CONFLICT", "이미 취소된 신청입니다.");
  },

  async markGymCancelled(
    actor: ActorContext,
    applicationId: string,
    ctx: NonNullable<
      Awaited<ReturnType<typeof applicationRepository.findApplicationOwnershipContext>>
    >,
  ): Promise<void> {
    if (ctx.status === ApplicationStatus.cancelled && ctx.cancellationSource === "gym") {
      return;
    }
    if (
      ctx.status !== ApplicationStatus.pending &&
      ctx.status !== ApplicationStatus.approved
    ) {
      throw new AppError("CONFLICT", "처리할 수 없는 신청 상태입니다.");
    }
    await applicationRepository.patchApplication(applicationId, {
      status: ApplicationStatus.cancelled,
      cancellationSource: ApplicationCancellationSource.gym,
    });
  },
};
