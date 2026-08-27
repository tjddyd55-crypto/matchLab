import "server-only";

import {
  AuditAction,
  BillingLedgerType,
  BillingReferenceType,
  BillingServiceType,
  type Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  ensureGymBillingAccount,
  ensureOrganizerBillingAccount,
} from "@/lib/billing/provision-billing-account";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { billingRepository } from "@/lib/repositories/billing.repository";

const INSUFFICIENT_MESSAGE =
  "크레딧이 부족하여 요청을 처리할 수 없습니다. 크레딧을 충전해 주세요.";

export type BillingMutationResult = {
  walletId: string;
  ledgerId: string;
  balanceBefore: number;
  balanceAfter: number;
  amount: number;
  skipped?: boolean;
};

type DebitCreditBase = {
  amount: number;
  type: BillingLedgerType;
  serviceType: BillingServiceType;
  reason: string;
  idempotencyKey: string;
  actorUserId?: string | null;
  referenceType?: BillingReferenceType | null;
  referenceId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

async function applyDelta(
  walletId: string,
  delta: number,
  fields: Omit<DebitCreditBase, "amount"> & { amount: number },
  tx: Prisma.TransactionClient,
): Promise<BillingMutationResult> {
  if (!Number.isInteger(fields.amount) || fields.amount === 0) {
    throw new AppError("VALIDATION_ERROR", "크레딧 금액은 0이 아닌 정수여야 합니다.");
  }
  if (!fields.idempotencyKey.trim()) {
    throw new AppError("VALIDATION_ERROR", "idempotencyKey가 필요합니다.");
  }

  const existing = await billingRepository.findLedgerByIdempotencyKey(
    fields.idempotencyKey,
    tx,
  );
  if (existing) {
    return {
      walletId: existing.walletId,
      ledgerId: existing.id,
      balanceBefore: existing.balanceBefore,
      balanceAfter: existing.balanceAfter,
      amount: existing.amount,
      skipped: true,
    };
  }

  const wallet = await billingRepository.lockWalletById(walletId, tx);
  if (!wallet) {
    throw new AppError("NOT_FOUND", "크레딧 지갑을 찾을 수 없습니다.");
  }

  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + delta;
  if (balanceAfter < 0) {
    throw new AppError("CONFLICT", INSUFFICIENT_MESSAGE);
  }

  await billingRepository.updateWalletBalance(wallet.id, balanceAfter, tx);
  const ledger = await billingRepository.createLedger(
    {
      walletId: wallet.id,
      type: fields.type,
      amount: delta,
      balanceBefore,
      balanceAfter,
      serviceType: fields.serviceType,
      referenceType: fields.referenceType ?? null,
      referenceId: fields.referenceId ?? null,
      idempotencyKey: fields.idempotencyKey,
      actorUserId: fields.actorUserId ?? null,
      reason: fields.reason,
      metadata: fields.metadata ?? null,
    },
    tx,
  );

  return {
    walletId: wallet.id,
    ledgerId: ledger.id,
    balanceBefore,
    balanceAfter,
    amount: delta,
    skipped: false,
  };
}

async function resolveOrganizerWalletId(
  organizerId: string,
  tx: Prisma.TransactionClient,
) {
  const account = await ensureOrganizerBillingAccount(organizerId, tx);
  if (!account.wallet) {
    throw new AppError("INTERNAL", "Organizer Wallet이 없습니다.");
  }
  return account.wallet.id;
}

async function resolveGymWalletId(gymId: string, tx: Prisma.TransactionClient) {
  const account = await ensureGymBillingAccount(gymId, tx);
  if (!account.wallet) {
    throw new AppError("INTERNAL", "Gym Wallet이 없습니다.");
  }
  return account.wallet.id;
}

export const billingCreditService = {
  async getOrganizerBalance(organizerId: string) {
    const account = await ensureOrganizerBillingAccount(organizerId);
    return {
      billingAccountId: account.id,
      walletId: account.wallet!.id,
      balance: account.wallet!.balance,
      status: account.status,
    };
  },

  async getGymBalance(gymId: string) {
    const account = await ensureGymBillingAccount(gymId);
    return {
      billingAccountId: account.id,
      walletId: account.wallet!.id,
      balance: account.wallet!.balance,
      status: account.status,
    };
  },

  async creditOrganizer(input: {
    organizerId: string;
    amount: number;
    type: BillingLedgerType;
    serviceType: BillingServiceType;
    reason: string;
    idempotencyKey: string;
    actorUserId?: string | null;
    referenceType?: BillingReferenceType | null;
    referenceId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    existingTx?: Prisma.TransactionClient;
  }): Promise<BillingMutationResult> {
    if (input.amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "충전 크레딧은 1 이상이어야 합니다.");
    }
    const run = async (tx: Prisma.TransactionClient) => {
      const walletId = await resolveOrganizerWalletId(input.organizerId, tx);
      return applyDelta(walletId, input.amount, input, tx);
    };
    if (input.existingTx) return run(input.existingTx);
    return prisma.$transaction(run);
  },

  async debitOrganizer(input: {
    organizerId: string;
    amount: number;
    type?: BillingLedgerType;
    serviceType: BillingServiceType;
    reason: string;
    idempotencyKey: string;
    actorUserId?: string | null;
    referenceType?: BillingReferenceType | null;
    referenceId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    existingTx?: Prisma.TransactionClient;
  }): Promise<BillingMutationResult> {
    if (input.amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "차감 크레딧은 1 이상이어야 합니다.");
    }
    const run = async (tx: Prisma.TransactionClient) => {
      const walletId = await resolveOrganizerWalletId(input.organizerId, tx);
      return applyDelta(
        walletId,
        -input.amount,
        {
          ...input,
          type: input.type ?? BillingLedgerType.usage,
          amount: input.amount,
        },
        tx,
      );
    };
    if (input.existingTx) return run(input.existingTx);
    return prisma.$transaction(run);
  },

  async refundOrganizer(input: {
    organizerId: string;
    amount: number;
    serviceType: BillingServiceType;
    reason: string;
    idempotencyKey: string;
    actorUserId?: string | null;
    referenceType?: BillingReferenceType | null;
    referenceId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    existingTx?: Prisma.TransactionClient;
  }): Promise<BillingMutationResult> {
    if (input.amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "환불 크레딧은 1 이상이어야 합니다.");
    }
    const run = async (tx: Prisma.TransactionClient) => {
      const walletId = await resolveOrganizerWalletId(input.organizerId, tx);
      return applyDelta(
        walletId,
        input.amount,
        {
          ...input,
          type: BillingLedgerType.refund,
          amount: input.amount,
        },
        tx,
      );
    };
    if (input.existingTx) return run(input.existingTx);
    return prisma.$transaction(run);
  },

  /** Super Admin 수동 충전 — Billing Ledger + AuditLog */
  async manualChargeOrganizer(input: {
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
      const idempotencyKey = `admin_manual:${input.organizerId}:${input.actor.userId}:${Date.now()}:${input.amount}:${input.memo ?? ""}`;
      const result = await this.creditOrganizer({
        organizerId: input.organizerId,
        amount: input.amount,
        type: BillingLedgerType.manual_charge,
        serviceType: BillingServiceType.admin,
        reason: "관리자 수동 충전",
        idempotencyKey,
        actorUserId: input.actor.userId,
        referenceType: BillingReferenceType.admin_manual,
        referenceId: input.actor.userId,
        metadata: input.memo?.trim()
          ? { memo: input.memo.trim() }
          : null,
        existingTx: tx,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.userId,
          action: AuditAction.credit_manual_charged,
          targetType: "BillingAccount",
          targetId: input.organizerId,
          beforeData: { balance: result.balanceBefore },
          afterData: {
            balance: result.balanceAfter,
            amount: input.amount,
            ledgerId: result.ledgerId,
            memo: input.memo?.trim() || null,
            ownerType: "organizer",
          },
        },
      });

      return result;
    });
  },

  listOrganizerLedgers(organizerId: string, limit = 50) {
    return billingRepository.listLedgersByOrganizerId(organizerId, limit);
  },

  listGymLedgers(gymId: string, limit = 50) {
    return billingRepository.listLedgersByGymId(gymId, limit);
  },
};

export { INSUFFICIENT_MESSAGE as BILLING_INSUFFICIENT_MESSAGE };
