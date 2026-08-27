import "server-only";

import {
  BillingLedgerType,
  BillingReferenceType,
  BillingServiceType,
  CreditLedgerType,
  type Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  creditsToKrw,
  DEFAULT_PARTICIPANT_FEE_CREDITS,
  getApproveableParticipantCount,
  participantFeeCredits,
} from "@/lib/credits/credit-policy";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { creditRepository } from "@/lib/repositories/credit.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { billingCreditService } from "@/lib/services/billing-credit.service";
import { ensureOrganizerBillingAccount } from "@/lib/billing/provision-billing-account";

const INSUFFICIENT_MESSAGE =
  "크레딧이 부족하여 참가 승인을 할 수 없습니다. 크레딧을 충전해 주세요.";

function approveIdempotencyKey(applicationId: string) {
  return `event_application:${applicationId}:approve`;
}

function refundIdempotencyKey(applicationId: string) {
  return `event_application:${applicationId}:refund`;
}

export const creditService = {
  async getOrCreateOrganizerWallet(organizerId: string) {
    const account = await ensureOrganizerBillingAccount(organizerId);
    return {
      id: account.wallet!.id,
      organizerId,
      balance: account.wallet!.balance,
      createdAt: account.wallet!.createdAt,
      updatedAt: account.wallet!.updatedAt,
    };
  },

  async getOrganizerCreditSummary(organizerId: string) {
    const wallet = await this.getOrCreateOrganizerWallet(organizerId);
    const fee = participantFeeCredits();
    return {
      balance: wallet.balance,
      balanceKrw: creditsToKrw(wallet.balance),
      participantFeeCredits: fee,
      approveableCount: getApproveableParticipantCount(wallet.balance, fee),
    };
  },

  async listCreditLedgers(organizerId: string, limit = 50) {
    const rows = await billingRepository.listLedgersByOrganizerId(
      organizerId,
      limit,
    );
    return rows.map((l) => ({
      id: l.id,
      type: l.type,
      amount: l.amount,
      balanceAfter: l.balanceAfter,
      reason: l.reason,
      memo:
        l.metadata &&
        typeof l.metadata === "object" &&
        !Array.isArray(l.metadata) &&
        "memo" in l.metadata
          ? String((l.metadata as { memo?: unknown }).memo ?? "")
          : null,
      createdAt: l.createdAt,
      eventId: null as string | null,
      eventApplicationId:
        l.referenceType === BillingReferenceType.event_application
          ? l.referenceId
          : null,
    }));
  },

  async assertSufficientBalance(organizerId: string, amount: number) {
    const wallet = await this.getOrCreateOrganizerWallet(organizerId);
    if (wallet.balance < amount) {
      throw new AppError("CONFLICT", INSUFFICIENT_MESSAGE);
    }
  },

  async addCreditsManually(input: {
    organizerId: string;
    amount: number;
    memo?: string;
    actor: ActorContext;
  }) {
    requireRole(input.actor, ["admin"]);
    return billingCreditService.manualChargeOrganizer(input);
  },

  async debitParticipantFee(
    input: {
      organizerId: string;
      eventId: string;
      eventApplicationId: string;
      actor: ActorContext;
      feeCredits?: number;
    },
    existingTx?: Prisma.TransactionClient,
  ) {
    const fee = input.feeCredits ?? participantFeeCredits();

    const run = async (tx: Prisma.TransactionClient) => {
      const app = await creditRepository.findApplicationCreditState(
        input.eventApplicationId,
        tx,
      );
      if (!app) {
        throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
      }
      if (app.event.organizerId !== input.organizerId) {
        throw new AppError("FORBIDDEN", "대회 소유 주최자가 일치하지 않습니다.");
      }
      if (app.creditChargedAt) {
        return {
          skipped: true as const,
          ledgerId: app.creditChargeLedgerId,
        };
      }

      const result = await billingCreditService.debitOrganizer({
        organizerId: input.organizerId,
        amount: fee,
        type: BillingLedgerType.usage,
        serviceType: BillingServiceType.event,
        reason: "참가 신청 승인 차감",
        idempotencyKey: approveIdempotencyKey(input.eventApplicationId),
        actorUserId: input.actor.userId,
        referenceType: BillingReferenceType.event_application,
        referenceId: input.eventApplicationId,
        metadata: {
          eventId: input.eventId,
          legacyType: CreditLedgerType.debit_participant,
        },
        existingTx: tx,
      });

      await creditRepository.markApplicationCharged(
        input.eventApplicationId,
        {
          creditChargedAt: new Date(),
          creditChargeLedgerId: result.ledgerId,
          creditChargeAmount: fee,
        },
        tx,
      );

      return { skipped: result.skipped === true, ...result };
    };

    if (existingTx) return run(existingTx);
    return prisma.$transaction(run);
  },

  async refundParticipantFee(
    input: {
      organizerId: string;
      eventId: string;
      eventApplicationId: string;
      actor: ActorContext;
    },
    existingTx?: Prisma.TransactionClient,
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const app = await creditRepository.findApplicationCreditState(
        input.eventApplicationId,
        tx,
      );
      if (!app) {
        throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
      }
      if (!app.creditChargedAt || app.creditChargeAmount <= 0) {
        return { skipped: true as const };
      }
      if (app.creditRefundedAt) {
        return { skipped: true as const };
      }

      const refundAmount = app.creditChargeAmount;
      const result = await billingCreditService.refundOrganizer({
        organizerId: input.organizerId,
        amount: refundAmount,
        serviceType: BillingServiceType.event,
        reason: "참가 승인 취소 환불",
        idempotencyKey: refundIdempotencyKey(input.eventApplicationId),
        actorUserId: input.actor.userId,
        referenceType: BillingReferenceType.event_application,
        referenceId: input.eventApplicationId,
        metadata: {
          eventId: input.eventId,
          legacyType: CreditLedgerType.refund_participant,
        },
        existingTx: tx,
      });

      await creditRepository.markApplicationRefunded(
        input.eventApplicationId,
        {
          creditRefundedAt: new Date(),
          creditRefundLedgerId: result.ledgerId,
        },
        tx,
      );

      return { skipped: result.skipped === true, ...result };
    };

    if (existingTx) return run(existingTx);
    return prisma.$transaction(run);
  },

  async getEventApprovalCreditContext(
    organizerId: string,
    pendingApprovalCount: number,
  ) {
    const summary = await this.getOrganizerCreditSummary(organizerId);
    const estimatedDebit =
      pendingApprovalCount * summary.participantFeeCredits;
    const insufficientForAll =
      summary.balance < summary.participantFeeCredits ||
      (pendingApprovalCount > 0 && summary.balance < estimatedDebit);

    return {
      ...summary,
      pendingApprovalCount,
      estimatedDebitForPending: estimatedDebit,
      insufficientForAll,
      insufficientForOne: summary.balance < summary.participantFeeCredits,
    };
  },

  async listOrganizersForAdmin() {
    return creditRepository.listOrganizersForAdmin();
  },
};

export { INSUFFICIENT_MESSAGE, DEFAULT_PARTICIPANT_FEE_CREDITS };
