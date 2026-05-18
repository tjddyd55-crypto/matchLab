/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const eventImageRepository = {
  async create(
    data: {
      eventId: string;
      imageUrl: string;
      imagePath: string | null;
      caption?: string | null;
      sortOrder?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventImage.create({ data });
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventImage.findUnique({
      where: { id },
      select: { id: true, eventId: true, imageUrl: true, imagePath: true },
    });
  },

  async listByEvent(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventImage.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async update(
    id: string,
    patch: {
      caption?: string | null;
      sortOrder?: number;
      imageUrl?: string;
      imagePath?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventImage.update({
      where: { id },
      data: patch,
    });
  },

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).eventImage.delete({ where: { id } });
  },

  async maxSortOrder(eventId: string, tx?: Prisma.TransactionClient) {
    const agg = await db(tx).eventImage.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });
    return agg._max.sortOrder ?? -1;
  },
};
