import "server-only";

import type { BillingAccountStatus, Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/lib/repositories/billing.repository";

/**
 * Association/Gym 승인 시 BillingAccount + Wallet 생성.
 * 이미 있으면 그대로 반환 (idempotent).
 */
export async function ensureOrganizerBillingAccount(
  organizerId: string,
  tx?: Prisma.TransactionClient,
  status: BillingAccountStatus = "active",
) {
  const run = async (client: Prisma.TransactionClient) => {
    const existing = await billingRepository.findAccountByOrganizerId(
      organizerId,
      client,
    );
    if (existing?.wallet) return existing;
    if (existing && !existing.wallet) {
      throw new AppError("INTERNAL", "BillingAccount에 Wallet이 없습니다.");
    }
    return billingRepository.createOrganizerAccount(organizerId, client, status);
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export async function ensureGymBillingAccount(
  gymId: string,
  tx?: Prisma.TransactionClient,
  status: BillingAccountStatus = "active",
) {
  const run = async (client: Prisma.TransactionClient) => {
    const existing = await billingRepository.findAccountByGymId(gymId, client);
    if (existing?.wallet) return existing;
    if (existing && !existing.wallet) {
      throw new AppError("INTERNAL", "BillingAccount에 Wallet이 없습니다.");
    }
    return billingRepository.createGymAccount(gymId, client, status);
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}
