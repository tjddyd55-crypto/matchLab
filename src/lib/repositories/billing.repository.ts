/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 * 공통 BillingAccount / CreditWallet / CreditLedger 접근.
 */
import type {
  BillingAccountStatus,
  BillingLedgerType,
  BillingOwnerType,
  BillingReferenceType,
  BillingServiceType,
  Prisma,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type CreateBillingLedgerInput = {
  walletId: string;
  type: BillingLedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  serviceType: BillingServiceType;
  referenceType?: BillingReferenceType | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  actorUserId?: string | null;
  reason: string;
  metadata?: Prisma.InputJsonValue | null;
  legacyLedgerId?: string | null;
  createdAt?: Date;
};

export const billingRepository = {
  async findAccountByOrganizerId(
    organizerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).billingAccount.findUnique({
      where: { organizerId },
      include: { wallet: true },
    });
  },

  async findAccountByGymId(gymId: string, tx?: Prisma.TransactionClient) {
    return db(tx).billingAccount.findUnique({
      where: { gymId },
      include: { wallet: true },
    });
  },

  async createOrganizerAccount(
    organizerId: string,
    tx: Prisma.TransactionClient,
    status: BillingAccountStatus = "active",
  ) {
    return tx.billingAccount.create({
      data: {
        ownerType: "organizer",
        organizerId,
        status,
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });
  },

  async createGymAccount(
    gymId: string,
    tx: Prisma.TransactionClient,
    status: BillingAccountStatus = "active",
  ) {
    return tx.billingAccount.create({
      data: {
        ownerType: "gym",
        gymId,
        status,
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });
  },

  async lockWalletById(walletId: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<
      { id: string; billingAccountId: string; balance: number }[]
    >`
      SELECT id, "billingAccountId", balance
      FROM "CreditWallet"
      WHERE id = ${walletId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  },

  async updateWalletBalance(
    walletId: string,
    balance: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.creditWallet.update({
      where: { id: walletId },
      data: { balance },
    });
  },

  async createLedger(
    input: CreateBillingLedgerInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.creditLedger.create({
      data: {
        walletId: input.walletId,
        type: input.type,
        amount: input.amount,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        serviceType: input.serviceType,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        actorUserId: input.actorUserId ?? null,
        reason: input.reason,
        metadata: input.metadata ?? undefined,
        legacyLedgerId: input.legacyLedgerId ?? null,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
    });
  },

  async findLedgerByIdempotencyKey(
    idempotencyKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).creditLedger.findUnique({
      where: { idempotencyKey },
    });
  },

  async findLedgerByLegacyId(
    legacyLedgerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).creditLedger.findUnique({
      where: { legacyLedgerId },
    });
  },

  async listLedgersByWalletId(walletId: string, limit = 50) {
    return prisma.creditLedger.findMany({
      where: { walletId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  },

  async listLedgersByOrganizerId(organizerId: string, limit = 50) {
    const account = await this.findAccountByOrganizerId(organizerId);
    if (!account?.wallet) return [];
    return this.listLedgersByWalletId(account.wallet.id, limit);
  },

  async listLedgersByGymId(gymId: string, limit = 50) {
    const account = await this.findAccountByGymId(gymId);
    if (!account?.wallet) return [];
    return this.listLedgersByWalletId(account.wallet.id, limit);
  },

  async countAccountsByOwnerType(ownerType: BillingOwnerType) {
    return prisma.billingAccount.count({ where: { ownerType } });
  },

  async countWallets() {
    return prisma.creditWallet.count();
  },

  async countLedgers() {
    return prisma.creditLedger.count();
  },
};
