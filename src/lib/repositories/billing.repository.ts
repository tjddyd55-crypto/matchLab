import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/billing/checkout-calculator";

type Tx = Prisma.TransactionClient;

export const billingPlanRepository = {
  async listActive() {
    return prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listAll() {
    return prisma.billingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findById(id: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingPlan.findUnique({ where: { id } });
  },

  async findByCode(code: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingPlan.findUnique({ where: { code } });
  },

  async update(
    id: string,
    data: {
      name?: string;
      price?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return prisma.billingPlan.update({ where: { id }, data });
  },
};

export const billingSubscriptionRepository = {
  async findLatestByUserId(userId: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });
  },

  async listForAdmin(input: {
    status?: string;
    q?: string;
    take?: number;
  }) {
    const take = input.take ?? 100;
    const status = input.status?.trim();
    const q = input.q?.trim();
    return prisma.billingSubscription.findMany({
      where: {
        ...(status
          ? { status: status as never }
          : {}),
        ...(q
          ? {
              user: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { loginId: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                ],
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            loginId: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        redemptions: {
          take: 1,
          orderBy: { redeemedAt: "desc" },
          include: { coupon: true },
        },
      },
    });
  },

  async create(
    data: Prisma.BillingSubscriptionCreateInput,
    tx?: Tx,
  ) {
    const db = tx ?? prisma;
    return db.billingSubscription.create({ data });
  },

  async update(
    id: string,
    data: Prisma.BillingSubscriptionUpdateInput,
    tx?: Tx,
  ) {
    const db = tx ?? prisma;
    return db.billingSubscription.update({ where: { id }, data });
  },
};

export const billingPaymentRepository = {
  async findByOrderId(orderId: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingPayment.findUnique({
      where: { orderId },
      include: { plan: true, subscription: true },
    });
  },

  async listByUserId(userId: string, take = 50) {
    return prisma.billingPayment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: { plan: true },
    });
  },

  async listForAdmin(input: { q?: string; take?: number }) {
    const take = input.take ?? 100;
    const q = input.q?.trim();
    return prisma.billingPayment.findMany({
      where: q
        ? {
            OR: [
              { orderId: { contains: q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { loginId: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            loginId: true,
            email: true,
            phone: true,
          },
        },
        redemptions: { include: { coupon: true }, take: 1 },
      },
    });
  },

  async create(data: Prisma.BillingPaymentCreateInput, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingPayment.create({ data });
  },

  async update(
    id: string,
    data: Prisma.BillingPaymentUpdateInput,
    tx?: Tx,
  ) {
    const db = tx ?? prisma;
    return db.billingPayment.update({ where: { id }, data });
  },
};

export const billingCouponRepository = {
  async listAll() {
    return prisma.billingCoupon.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findByNormalizedCode(code: string, tx?: Tx) {
    const db = tx ?? prisma;
    const normalized = normalizeCouponCode(code);
    if (!normalized) return null;
    return db.billingCoupon.findFirst({
      where: { code: { equals: normalized, mode: "insensitive" } },
    });
  },

  async findById(id: string) {
    return prisma.billingCoupon.findUnique({ where: { id } });
  },

  async create(data: Prisma.BillingCouponCreateInput) {
    return prisma.billingCoupon.create({ data });
  },

  async update(id: string, data: Prisma.BillingCouponUpdateInput) {
    return prisma.billingCoupon.update({ where: { id }, data });
  },

  async lockById(id: string, tx: Tx) {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "BillingCoupon" WHERE id = $1 FOR UPDATE`,
      id,
    );
    if (!rows[0]) return null;
    return tx.billingCoupon.findUnique({ where: { id } });
  },

  async incrementRedemptionCount(id: string, tx: Tx) {
    return tx.billingCoupon.update({
      where: { id },
      data: { redemptionCount: { increment: 1 } },
    });
  },
};

export const billingCouponRedemptionRepository = {
  async countByUserAndCoupon(userId: string, couponId: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.billingCouponRedemption.count({
      where: { userId, couponId },
    });
  },

  async create(
    data: Prisma.BillingCouponRedemptionCreateInput,
    tx?: Tx,
  ) {
    const db = tx ?? prisma;
    return db.billingCouponRedemption.create({ data });
  },
};
