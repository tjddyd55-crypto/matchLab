/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type StaffAccessLinkRow = {
  id: string;
  eventId: string;
  token: string;
  label: string;
  accessCode: string | null;
  role: string;
  canChangeMatchStatus: boolean;
  canRecordOutcomeDraft: boolean;
  canConfirmResult: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export const eventStaffAccessRepository = {
  async create(
    data: {
      eventId: string;
      token: string;
      label: string;
      accessCode?: string | null;
      role: string;
      canChangeMatchStatus: boolean;
      canRecordOutcomeDraft: boolean;
      canConfirmResult: boolean;
      expiresAt: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<StaffAccessLinkRow> {
    const row = await db(tx).eventStaffAccessLink.create({
      data: {
        eventId: data.eventId,
        token: data.token,
        label: data.label.trim(),
        accessCode: data.accessCode?.trim() || null,
        role: data.role.trim(),
        canChangeMatchStatus: data.canChangeMatchStatus,
        canRecordOutcomeDraft: data.canRecordOutcomeDraft,
        canConfirmResult: data.canConfirmResult,
        expiresAt: data.expiresAt,
      },
    });
    return row as StaffAccessLinkRow;
  },

  async findByToken(
    token: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StaffAccessLinkRow | null> {
    const row = await db(tx).eventStaffAccessLink.findUnique({
      where: { token },
    });
    return row as StaffAccessLinkRow | null;
  },

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StaffAccessLinkRow | null> {
    const row = await db(tx).eventStaffAccessLink.findUnique({
      where: { id },
    });
    return row as StaffAccessLinkRow | null;
  },

  async listByEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StaffAccessLinkRow[]> {
    const rows = await db(tx).eventStaffAccessLink.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });
    return rows as StaffAccessLinkRow[];
  },

  async revoke(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).eventStaffAccessLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },
};
