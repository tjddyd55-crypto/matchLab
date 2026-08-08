/**
 * [CONTRACT] PrismaClient import는 repositories 내부에만 허용.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { normalizeLockerLabel } from "@/lib/gym-member/locker-label";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const gymMemberLockerRepository = {
  async listForMember(gymId: string, gymMemberId: string) {
    return prisma.gymMemberLockerRental.findMany({
      where: { gymId, gymMemberId, deletedAt: null },
      orderBy: [{ endedAt: "asc" }, { startedAt: "desc" }],
    });
  },

  async findActiveForMember(gymId: string, gymMemberId: string) {
    return prisma.gymMemberLockerRental.findFirst({
      where: {
        gymId,
        gymMemberId,
        deletedAt: null,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });
  },

  async findByIdForGym(id: string, gymId: string) {
    return prisma.gymMemberLockerRental.findFirst({
      where: { id, gymId, deletedAt: null },
    });
  },

  /**
   * 동일 gym + 동일 lockerLabel(정규화)에서 endedAt IS NULL 인 rental.
   * overlap은 service에서 date range로 판정한다.
   */
  async findOpenByLabel(
    gymId: string,
    lockerLabel: string,
    tx?: Prisma.TransactionClient,
  ) {
    const label = normalizeLockerLabel(lockerLabel);
    return db(tx).gymMemberLockerRental.findMany({
      where: {
        gymId,
        deletedAt: null,
        endedAt: null,
        lockerLabel: label,
      },
      select: {
        id: true,
        gymMemberId: true,
        lockerLabel: true,
        startedAt: true,
        endsAt: true,
      },
    });
  },

  async create(
    data: Prisma.GymMemberLockerRentalCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberLockerRental.create({ data });
  },

  async createUnchecked(
    data: Prisma.GymMemberLockerRentalUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberLockerRental.create({ data });
  },

  async update(
    id: string,
    data: Prisma.GymMemberLockerRentalUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberLockerRental.update({ where: { id }, data });
  },
};
