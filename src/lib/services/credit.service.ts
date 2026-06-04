import "server-only";

import { CreditLedgerType, type Prisma } from "@/generated/prisma";
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

const INSUFFICIENT_MESSAGE =
  "크레딧이 부족하여 참가 승인을 할 수 없습니다. 크레딧을 충전해 주세요.";

async function ensureWalletInTx(
  organizerId: string,
  tx: Parameters<typeof creditRepository.lockWalletByOrganizerId>[1],
) {
  let wallet = await creditRepository.lockWalletByOrganizerId(organizerId, tx);
  if (!wallet) {
    await creditRepository.createWallet(organizerId, tx);
    wallet = await creditRepository.lockWalletByOrganizerId(organizerId, tx);
  }
  if (!wallet) {
    throw new AppError("INTERNAL", "크레딧 지갑을 생성할 수 없습니다.");
  }
  return wallet;
}

async function applyLedgerDelta(
  organizerId: string,
  delta: number,
  ledger: Omit<
    Parameters<typeof creditRepository.createLedger>[0],
    "walletId" | "organizerId" | "amount" | "balanceAfter"
  >,
  tx: Parameters<typeof creditRepository.lockWalletByOrganizerId>[1],
) {
  const wallet = await ensureWalletInTx(organizerId, tx);
  const nextBalance = wallet.balance + delta;
  if (nextBalance < 0) {
    throw new AppError("CONFLICT", INSUFFICIENT_MESSAGE);
  }

  await creditRepository.updateWalletBalance(wallet.id, nextBalance, tx);
  const row = await creditRepository.createLedger(
    {
      walletId: wallet.id,
      organizerId,
      amount: delta,
      balanceAfter: nextBalance,
      ...ledger,
    },
    tx,
  );

  return { walletId: wallet.id, ledgerId: row.id, balanceAfter: nextBalance };
}

export const creditService = {
  async getOrCreateOrganizerWallet(organizerId: string) {
    const existing = await creditRepository.findWalletByOrganizerId(organizerId);
    if (existing) return existing;
    return creditRepository.createWallet(organizerId);
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
    return creditRepository.listLedgersByOrganizerId(organizerId, limit);
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
    if (input.amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "충전 크레딧은 1 이상이어야 합니다.");
    }

    return prisma.$transaction(async (tx) => {
      return applyLedgerDelta(
        input.organizerId,
        input.amount,
        {
          type: CreditLedgerType.manual_charge,
          reason: "관리자 수동 충전",
          memo: input.memo?.trim() || null,
          createdByUserId: input.actor.userId,
        },
        tx,
      );
    });
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

      const existingDebit = await creditRepository.findLedgerByApplicationAndType(
        input.eventApplicationId,
        CreditLedgerType.debit_participant,
        tx,
      );
      if (existingDebit) {
        await creditRepository.markApplicationCharged(
          input.eventApplicationId,
          {
            creditChargedAt: existingDebit.createdAt,
            creditChargeLedgerId: existingDebit.id,
            creditChargeAmount: Math.abs(existingDebit.amount),
          },
          tx,
        );
        return { skipped: true as const, ledgerId: existingDebit.id };
      }

      const result = await applyLedgerDelta(
        input.organizerId,
        -fee,
        {
          type: CreditLedgerType.debit_participant,
          reason: "참가 신청 승인 차감",
          eventId: input.eventId,
          eventApplicationId: input.eventApplicationId,
          createdByUserId: input.actor.userId,
        },
        tx,
      );

      await creditRepository.markApplicationCharged(
        input.eventApplicationId,
        {
          creditChargedAt: new Date(),
          creditChargeLedgerId: result.ledgerId,
          creditChargeAmount: fee,
        },
        tx,
      );

      return { skipped: false as const, ...result };
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

      const existingRefund = await creditRepository.findLedgerByApplicationAndType(
        input.eventApplicationId,
        CreditLedgerType.refund_participant,
        tx,
      );
      if (existingRefund) {
        await creditRepository.markApplicationRefunded(
          input.eventApplicationId,
          {
            creditRefundedAt: existingRefund.createdAt,
            creditRefundLedgerId: existingRefund.id,
          },
          tx,
        );
        return { skipped: true as const };
      }

      const refundAmount = app.creditChargeAmount;
      const result = await applyLedgerDelta(
        input.organizerId,
        refundAmount,
        {
          type: CreditLedgerType.refund_participant,
          reason: "참가 승인 취소 환불",
          eventId: input.eventId,
          eventApplicationId: input.eventApplicationId,
          createdByUserId: input.actor.userId,
        },
        tx,
      );

      await creditRepository.markApplicationRefunded(
        input.eventApplicationId,
        {
          creditRefundedAt: new Date(),
          creditRefundLedgerId: result.ledgerId,
        },
        tx,
      );

      return { skipped: false as const, ...result };
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
