/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { AuditAction } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const auditRepository = {
  async createAuditLog(
    row: {
      actorUserId: string | null;
      action: AuditAction;
      targetType: string;
      targetId?: string | null;
      beforeData?: Prisma.InputJsonValue | null;
      afterData?: Prisma.InputJsonValue | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).auditLog.create({
      data: {
        actorUserId: row.actorUserId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId ?? null,
        beforeData: row.beforeData ?? undefined,
        afterData: row.afterData ?? undefined,
      },
    });
  },
};
