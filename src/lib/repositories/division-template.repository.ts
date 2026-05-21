/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type DivisionTemplateListRow = {
  id: string;
  organizerId: string;
  title: string;
  sportType: string | null;
  description: string | null;
  items: Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizer: { id: string; name: string };
};

export const divisionTemplateRepository = {
  async list(
    options?: { organizerId?: string; isActive?: boolean },
    tx?: Prisma.TransactionClient,
  ): Promise<DivisionTemplateListRow[]> {
    const organizerId = options?.organizerId?.trim();
    return db(tx).divisionTemplate.findMany({
      where: {
        ...(organizerId ? { organizerId } : {}),
        ...(options?.isActive !== undefined
          ? { isActive: options.isActive }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DivisionTemplateListRow | null> {
    return db(tx).divisionTemplate.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async create(
    data: {
      organizerId: string;
      title: string;
      sportType?: string | null;
      description?: string | null;
      isActive?: boolean;
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
        isActive: data.isActive ?? true,
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
      isActive?: boolean;
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
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.items !== undefined ? { items: data.items } : {}),
      },
    });
  },

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).divisionTemplate.delete({ where: { id } });
  },
};
