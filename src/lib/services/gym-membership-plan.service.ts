import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction } from "@/lib/enums";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import type { GymMembershipPlanInput } from "@/lib/validators/gym-member.validator";

export const gymMembershipPlanService = {
  async listPlans(actor: ActorContext, includeInactive = false) {
    const access = await requireGymPortalRead(actor);
    return prisma.gymMembershipPlan.findMany({
      where: {
        gymId: access.gymId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            subscriptions: {
              where: { status: { in: ["active", "paused"] } },
            },
          },
        },
      },
    });
  },

  async createPlan(actor: ActorContext, input: GymMembershipPlanInput) {
    const access = await requireGymPortalWrite(actor);
    if (
      input.durationType !== "fixed_end" &&
      (!input.durationValue || input.durationValue <= 0)
    ) {
      throw new AppError("VALIDATION_ERROR", "기간 값을 입력해 주세요.");
    }

    const plan = await prisma.gymMembershipPlan.create({
      data: {
        gymId: access.gymId,
        name: input.name.trim(),
        durationType: input.durationType,
        durationValue: input.durationValue ?? null,
        price: input.price,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_subscription_changed,
      targetType: "GymMembershipPlan",
      targetId: plan.id,
      afterData: { op: "create", name: plan.name },
    });

    return plan;
  },

  async updatePlan(
    actor: ActorContext,
    planId: string,
    input: GymMembershipPlanInput,
  ) {
    const access = await requireGymPortalWrite(actor);
    const existing = await prisma.gymMembershipPlan.findFirst({
      where: { id: planId, gymId: access.gymId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
    }

    const plan = await prisma.gymMembershipPlan.update({
      where: { id: planId },
      data: {
        name: input.name.trim(),
        durationType: input.durationType,
        durationValue: input.durationValue ?? null,
        price: input.price,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        isActive: input.isActive ?? true,
      },
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_subscription_changed,
      targetType: "GymMembershipPlan",
      targetId: plan.id,
      afterData: { op: "update", name: plan.name },
    });

    return plan;
  },

  async softDeletePlan(actor: ActorContext, planId: string) {
    const access = await requireGymPortalWrite(actor);
    const existing = await prisma.gymMembershipPlan.findFirst({
      where: { id: planId, gymId: access.gymId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
    }
    await prisma.gymMembershipPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async reorderPlans(actor: ActorContext, orderedIds: string[]) {
    const access = await requireGymPortalWrite(actor);
    let order = 0;
    for (const id of orderedIds) {
      const existing = await prisma.gymMembershipPlan.findFirst({
        where: { id, gymId: access.gymId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) continue;
      await prisma.gymMembershipPlan.update({
        where: { id },
        data: { sortOrder: order++ },
      });
    }
  },
};
