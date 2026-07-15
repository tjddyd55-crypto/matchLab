/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma";
import { GymStatus, UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const gymRepository = {
  async listActiveGymsForPicker(): Promise<{ id: string; name: string }[]> {
    return prisma.gym.findMany({
      where: { status: GymStatus.active },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  },

  async findActiveGymById(gymId: string, tx?: Prisma.TransactionClient) {
    return db(tx).gym.findFirst({
      where: { id: gymId, status: GymStatus.active },
      select: { id: true, name: true },
    });
  },

  async findActiveGymByNameInsensitive(
    name: string,
    tx?: Prisma.TransactionClient,
  ) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    return db(tx).gym.findFirst({
      where: {
        status: GymStatus.active,
        name: { equals: trimmed, mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
  },

  /**
   * 주최자 직접 등록용 — 동일 이름 체육관이 있으면 재사용, 없으면 placeholder 계정+체육관 생성.
   */
  async findOrCreateGymForOrganizerManualEntry(
    name: string,
    tx?: Prisma.TransactionClient,
    ownerSnapshot?: {
      ownerName?: string | null;
      phone?: string | null;
      gymPhone?: string | null;
      address?: string | null;
    },
  ): Promise<{ id: string; name: string; created: boolean }> {
    const trimmed = name.trim();
    const existing = await gymRepository.findActiveGymByNameInsensitive(
      trimmed,
      tx,
    );
    if (existing) {
      return { ...existing, created: false };
    }

    const client = db(tx);
    const suffix = randomBytes(6).toString("hex");
    const ownerName =
      ownerSnapshot?.ownerName?.trim() || trimmed;
    const ownerPhone = ownerSnapshot?.phone?.trim() || null;
    const owner = await client.user.create({
      data: {
        loginId: `manual-gym-${suffix}`,
        email: `manual-gym-${suffix}@internal.invalid`,
        name: ownerName,
        phone: ownerPhone,
        role: UserRole.gym,
      },
      select: { id: true },
    });

    const gym = await client.gym.create({
      data: {
        ownerUserId: owner.id,
        name: trimmed,
        phone: ownerSnapshot?.gymPhone?.trim() || ownerPhone || undefined,
        address: ownerSnapshot?.address?.trim() || undefined,
        status: GymStatus.active,
      },
      select: { id: true, name: true },
    });

    return { ...gym, created: true };
  },
};
