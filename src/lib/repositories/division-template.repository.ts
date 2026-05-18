/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const divisionTemplateRepository = {
  async listByOrganizer(organizerId: string, tx?: Prisma.TransactionClient) {
    return db(tx).divisionTemplate.findMany({
      where: { organizerId },
      orderBy: [{ updatedAt: "desc" }],
    });
  },

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; organizerId: string; title: string; items: Prisma.JsonValue } | null> {
    const row = await db(tx).divisionTemplate.findUnique({
      where: { id },
      select: { id: true, organizerId: true, title: true, items: true },
    });
    return row;
  },

  async create(
    data: {
      organizerId: string;
      title: string;
      sportType?: string | null;
      description?: string | null;
      items: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).divisionTemplate.create({
      data: {
        organizerId: data.organizerId,
        title: data.title.trim(),
        sportType: data.sportType?.trim() || null,
        description: data.description?.trim() || null,
        items: data.items,
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      sportType?: string | null;
      description?: string | null;
      items?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).divisionTemplate.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.sportType !== undefined
          ? { sportType: data.sportType?.trim() || null }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.items !== undefined ? { items: data.items } : {}),
      },
    });
  },

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).divisionTemplate.delete({ where: { id } });
  },
};
