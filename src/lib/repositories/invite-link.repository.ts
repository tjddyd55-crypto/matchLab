/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  InviteLinkStatus,
  InviteLinkType,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type GymInviteLinkRow = {
  id: string;
  gymId: string;
  token: string;
  type: InviteLinkType;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  status: InviteLinkStatus;
  createdAt: Date;
};

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const inviteLinkRepository = {
  async createGymInviteLink(
    data: {
      gymId: string;
      token: string;
      type: InviteLinkType;
      expiresAt: Date | null;
      maxUses: number | null;
      createdByUserId: string;
      status?: InviteLinkStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<GymInviteLinkRow> {
    const row = await db(tx).gymInviteLink.create({
      data: {
        gymId: data.gymId,
        token: data.token,
        type: data.type,
        expiresAt: data.expiresAt,
        maxUses: data.maxUses,
        createdByUserId: data.createdByUserId,
        status: data.status ?? InviteLinkStatus.active,
      },
    });
    return row as GymInviteLinkRow;
  },

  async listGymInviteLinks(gymId: string): Promise<GymInviteLinkRow[]> {
    return prisma.gymInviteLink.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        gymId: true,
        token: true,
        type: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        status: true,
        createdAt: true,
      },
    }) as Promise<GymInviteLinkRow[]>;
  },

  async findInviteLinkByToken(
    token: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    | (GymInviteLinkRow & {
        gym: { name: string };
      })
    | null
  > {
    const row = await db(tx).gymInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        gymId: true,
        token: true,
        type: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        status: true,
        createdAt: true,
        gym: { select: { name: true } },
      },
    });
    return row as (GymInviteLinkRow & { gym: { name: string } }) | null;
  },

  async incrementInviteLinkUsage(
    token: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).gymInviteLink.update({
      where: { token },
      data: { usedCount: { increment: 1 } },
    });
  },

  async updateInviteLinkStatus(
    id: string,
    status: InviteLinkStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).gymInviteLink.update({
      where: { id },
      data: { status },
    });
  },
};
