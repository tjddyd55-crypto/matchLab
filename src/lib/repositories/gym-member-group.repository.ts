/**
 * [CONTRACT] PrismaClient import는 repositories 내부에만 허용.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const gymMemberGroupRepository = {
  async listByGym(gymId: string, opts?: { includeInactive?: boolean }) {
    return prisma.gymMemberGroup.findMany({
      where: {
        gymId,
        deletedAt: null,
        ...(opts?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            assignments: { where: { deletedAt: null } },
          },
        },
      },
    });
  },

  async findByIdForGym(id: string, gymId: string) {
    return prisma.gymMemberGroup.findFirst({
      where: { id, gymId, deletedAt: null },
    });
  },

  async findActiveByName(
    gymId: string,
    name: string,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberGroup.findFirst({
      where: {
        gymId,
        deletedAt: null,
        name: name.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  async create(
    data: Prisma.GymMemberGroupCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberGroup.create({ data });
  },

  async update(
    id: string,
    data: Prisma.GymMemberGroupUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymMemberGroup.update({ where: { id }, data });
  },

  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymMemberGroup.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async listAssignmentsForMember(gymMemberId: string, gymId: string) {
    return prisma.gymMemberGroupAssignment.findMany({
      where: { gymMemberId, gymId, deletedAt: null },
      include: { group: true },
      orderBy: { group: { sortOrder: "asc" } },
    });
  },

  async replaceMemberGroups(
    gymId: string,
    gymMemberId: string,
    groupIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = db(tx);
    const member = await client.gymMember.findFirst({
      where: { id: gymMemberId, gymId, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new Error("NOT_FOUND_MEMBER_FOR_GYM");
    }
    const unique = [...new Set(groupIds.filter(Boolean))];
    const validGroups = await client.gymMemberGroup.findMany({
      where: {
        gymId,
        deletedAt: null,
        isActive: true,
        id: { in: unique },
      },
      select: { id: true },
    });
    const validIds = new Set(validGroups.map((g) => g.id));

    await client.gymMemberGroupAssignment.updateMany({
      where: {
        gymId,
        gymMemberId,
        deletedAt: null,
        groupId: { notIn: [...validIds] },
      },
      data: { deletedAt: new Date() },
    });

    for (const groupId of validIds) {
      const existing = await client.gymMemberGroupAssignment.findFirst({
        where: { gymMemberId, groupId },
      });
      if (existing) {
        if (existing.deletedAt) {
          await client.gymMemberGroupAssignment.update({
            where: { id: existing.id },
            data: { deletedAt: null },
          });
        }
      } else {
        await client.gymMemberGroupAssignment.create({
          data: { gymId, gymMemberId, groupId },
        });
      }
    }
  },
};
