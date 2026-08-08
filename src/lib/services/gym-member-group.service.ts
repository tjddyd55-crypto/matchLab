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
import { gymMemberGroupRepository } from "@/lib/repositories/gym-member-group.repository";
import type { Prisma } from "@/generated/prisma";

export const gymMemberGroupService = {
  async listGroups(actor: ActorContext, includeInactive = false) {
    const access = await requireGymPortalRead(actor);
    return gymMemberGroupRepository.listByGym(access.gymId, {
      includeInactive,
    });
  },

  async createGroup(
    actor: ActorContext,
    input: { name: string; sortOrder?: number; isActive?: boolean },
  ) {
    const access = await requireGymPortalWrite(actor);
    const name = input.name.trim();
    if (!name) throw new AppError("VALIDATION_ERROR", "그룹명을 입력해 주세요.");
    const group = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 동일 gym 활성명 중복 race 완화
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gym-member-group:${access.gymId}:${name}`}))`;
      const dup = await gymMemberGroupRepository.findActiveByName(
        access.gymId,
        name,
        undefined,
        tx,
      );
      if (dup) {
        throw new AppError("CONFLICT", "같은 이름의 그룹이 이미 있습니다.");
      }
      return gymMemberGroupRepository.create(
        {
          gym: { connect: { id: access.gymId } },
          name,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
        },
        tx,
      );
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_updated,
      targetType: "GymMemberGroup",
      targetId: group.id,
      afterData: { op: "create", name: group.name },
    });
    return group;
  },

  async updateGroup(
    actor: ActorContext,
    groupId: string,
    input: { name: string; sortOrder?: number; isActive?: boolean },
  ) {
    const access = await requireGymPortalWrite(actor);
    const existing = await gymMemberGroupRepository.findByIdForGym(
      groupId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "그룹을 찾을 수 없습니다.");
    const name = input.name.trim();
    const dup = await gymMemberGroupRepository.findActiveByName(
      access.gymId,
      name,
      groupId,
    );
    if (dup) {
      throw new AppError("CONFLICT", "같은 이름의 그룹이 이미 있습니다.");
    }
    return gymMemberGroupRepository.update(groupId, {
      name,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      isActive: input.isActive ?? existing.isActive,
    });
  },

  async reorderGroups(actor: ActorContext, orderedIds: string[]) {
    const access = await requireGymPortalWrite(actor);
    let order = 0;
    for (const id of orderedIds) {
      const g = await gymMemberGroupRepository.findByIdForGym(id, access.gymId);
      if (!g) continue;
      await gymMemberGroupRepository.update(id, { sortOrder: order++ });
    }
  },

  async softDeleteGroup(actor: ActorContext, groupId: string) {
    const access = await requireGymPortalWrite(actor);
    const existing = await gymMemberGroupRepository.findByIdForGym(
      groupId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "그룹을 찾을 수 없습니다.");
    await gymMemberGroupRepository.softDelete(groupId);
  },

  async setMemberGroups(
    actor: ActorContext,
    memberId: string,
    groupIds: string[],
  ) {
    const access = await requireGymPortalWrite(actor);
    try {
      await gymMemberGroupRepository.replaceMemberGroups(
        access.gymId,
        memberId,
        groupIds,
      );
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND_MEMBER_FOR_GYM") {
        throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
      }
      throw e;
    }
  },

  async listMemberAssignments(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalRead(actor);
    return gymMemberGroupRepository.listAssignmentsForMember(
      memberId,
      access.gymId,
    );
  },
};
