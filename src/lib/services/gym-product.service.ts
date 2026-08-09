import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { GymProductCategory } from "@/lib/enums";
import { requireGymPortalSalesManage } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export const gymProductService = {
  async listProducts(
    actor: ActorContext,
    opts?: { activeOnly?: boolean; q?: string },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const q = opts?.q?.trim();
    return prisma.gymProduct.findMany({
      where: {
        gymId: access.gymId,
        deletedAt: null,
        ...(opts?.activeOnly ? { isActive: true } : {}),
        ...(q
          ? { name: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  async createProduct(
    actor: ActorContext,
    input: {
      name: string;
      category?: GymProductCategory;
      defaultPrice: number;
      memo?: string | null;
      isActive?: boolean;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const name = normalizeName(input.name);
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "상품명을 입력해 주세요.");
    }
    if (!Number.isFinite(input.defaultPrice) || input.defaultPrice < 0) {
      throw new AppError("VALIDATION_ERROR", "기본가격이 올바르지 않습니다.");
    }
    const maxSort = await prisma.gymProduct.aggregate({
      where: { gymId: access.gymId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return prisma.gymProduct.create({
      data: {
        gymId: access.gymId,
        name,
        category: input.category ?? GymProductCategory.goods,
        defaultPrice: Math.trunc(input.defaultPrice),
        memo: input.memo?.trim() || null,
        isActive: input.isActive ?? true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  },

  async updateProduct(
    actor: ActorContext,
    productId: string,
    input: {
      name: string;
      category?: GymProductCategory;
      defaultPrice: number;
      memo?: string | null;
      isActive?: boolean;
    },
  ) {
    const access = await requireGymPortalSalesManage(actor);
    const existing = await prisma.gymProduct.findFirst({
      where: { id: productId, gymId: access.gymId, deletedAt: null },
    });
    if (!existing) throw new AppError("NOT_FOUND", "상품을 찾을 수 없습니다.");
    const name = normalizeName(input.name);
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "상품명을 입력해 주세요.");
    }
    if (!Number.isFinite(input.defaultPrice) || input.defaultPrice < 0) {
      throw new AppError("VALIDATION_ERROR", "기본가격이 올바르지 않습니다.");
    }
    return prisma.gymProduct.update({
      where: { id: productId },
      data: {
        name,
        category: input.category ?? existing.category,
        defaultPrice: Math.trunc(input.defaultPrice),
        memo: input.memo?.trim() || null,
        isActive: input.isActive ?? existing.isActive,
      },
    });
  },

  async softDeleteProduct(actor: ActorContext, productId: string) {
    const access = await requireGymPortalSalesManage(actor);
    const existing = await prisma.gymProduct.findFirst({
      where: { id: productId, gymId: access.gymId, deletedAt: null },
    });
    if (!existing) throw new AppError("NOT_FOUND", "상품을 찾을 수 없습니다.");
    return prisma.gymProduct.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async reorderProducts(actor: ActorContext, orderedIds: string[]) {
    const access = await requireGymPortalSalesManage(actor);
    const rows = await prisma.gymProduct.findMany({
      where: {
        gymId: access.gymId,
        deletedAt: null,
        id: { in: orderedIds },
      },
      select: { id: true },
    });
    if (rows.length !== orderedIds.length) {
      throw new AppError("VALIDATION_ERROR", "상품 목록이 올바르지 않습니다.");
    }
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.gymProduct.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return { ok: true as const };
  },
};

import { gymProductCategoryLabel } from "@/lib/gym-products/labels";

export { gymProductCategoryLabel };
