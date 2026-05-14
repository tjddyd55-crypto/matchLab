/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { NotificationType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const notificationRepository = {
  async createNotification(
    row: {
      userId: string;
      eventId?: string | null;
      type: NotificationType;
      title: string;
      content: string;
      href?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).notification.create({
      data: {
        userId: row.userId,
        eventId: row.eventId ?? null,
        type: row.type,
        title: row.title,
        content: row.content,
        href: row.href ?? null,
      },
    });
  },

  async createManyNotifications(
    rows: Array<{
      userId: string;
      eventId?: string | null;
      type: NotificationType;
      title: string;
      content: string;
      href?: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (rows.length === 0) return;
    await db(tx).notification.createMany({
      data: rows.map((r) => ({
        userId: r.userId,
        eventId: r.eventId ?? null,
        type: r.type,
        title: r.title,
        content: r.content,
        href: r.href ?? null,
      })),
    });
  },

  async listNotificationsByUser(userId: string, take = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        href: true,
        readAt: true,
        createdAt: true,
        eventId: true,
      },
    });
  },

  async countUnreadByUser(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },

  async markNotificationRead(
    notificationId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const res = await db(tx).notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  },

  async markAllNotificationsRead(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async findMatchCornerFighterIds(
    matchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const row = await db(tx).bracketMatch.findUnique({
      where: { id: matchId },
      select: { fighterRedId: true, fighterBlueId: true },
    });
    if (!row) return [];
    return [row.fighterRedId, row.fighterBlueId].filter(
      (id): id is string => Boolean(id),
    );
  },

  async resolveNotifyUserIdsForFighterIds(
    fighterIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    if (fighterIds.length === 0) return [];
    const uniq = [...new Set(fighterIds)];
    const rows = await db(tx).fighter.findMany({
      where: { id: { in: uniq } },
      select: {
        userId: true,
        currentGym: { select: { ownerUserId: true } },
      },
    });
    const out = new Set<string>();
    for (const r of rows) {
      if (r.userId) out.add(r.userId);
      if (r.currentGym?.ownerUserId) out.add(r.currentGym.ownerUserId);
    }
    return [...out];
  },

  async listCornerFighterIdsForBracket(
    bracketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const rows = await db(tx).bracketMatch.findMany({
      where: { bracketId },
      select: { fighterRedId: true, fighterBlueId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.fighterRedId) ids.add(r.fighterRedId);
      if (r.fighterBlueId) ids.add(r.fighterBlueId);
    }
    return [...ids];
  },

  async getEventSlugTitle(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ publicSlug: string; title: string } | null> {
    return db(tx).event.findUnique({
      where: { id: eventId },
      select: { publicSlug: true, title: true },
    });
  },
};
