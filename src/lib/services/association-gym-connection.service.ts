import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AssociationGymConnectionRequestStatus,
  AssociationMemberGymStatus,
  AuditAction,
  OrganizerStatus,
  OrganizerType,
  UserRole,
} from "@/lib/enums";
import {
  parseMemberGymSettings,
} from "@/lib/member-gym/settings";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";

function formatMemberCode(prefix: string, padding: number, n: number): string {
  return `${prefix}${String(n).padStart(padding, "0")}`;
}

function resolveOwnedGymId(actor: ActorContext): string {
  requireRole(actor, [UserRole.gym]);
  if (!actor.gymId) {
    throw new AppError("FORBIDDEN", "체육관 정보가 없습니다.");
  }
  return actor.gymId;
}

export const associationGymConnectionService = {
  async listJoinableAssociations(q?: string) {
    const query = q?.trim();
    return prisma.organizer.findMany({
      where: {
        type: OrganizerType.association,
        status: OrganizerStatus.active,
        ...(query
          ? { name: { contains: query, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        websiteUrl: true,
      },
    });
  },

  async listForGym(actor: ActorContext) {
    const gymId = resolveOwnedGymId(actor);
    const [memberships, requests] = await Promise.all([
      prisma.associationMemberGym.findMany({
        where: { gymId },
        orderBy: { joinedAt: "desc" },
        include: {
          organizer: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      }),
      prisma.associationGymConnectionRequest.findMany({
        where: { gymId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          associationOrganizer: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      }),
    ]);
    return { gymId, memberships, requests };
  },

  async submitRequest(
    actor: ActorContext,
    associationOrganizerId: string,
    memo?: string,
  ) {
    const gymId = resolveOwnedGymId(actor);

    const organizer = await prisma.organizer.findFirst({
      where: {
        id: associationOrganizerId,
        type: OrganizerType.association,
        status: OrganizerStatus.active,
      },
      select: { id: true, name: true },
    });
    if (!organizer) {
      throw new AppError("NOT_FOUND", "협회를 찾을 수 없습니다.");
    }

    const existingMember = await prisma.associationMemberGym.findUnique({
      where: {
        organizerId_gymId: {
          organizerId: associationOrganizerId,
          gymId,
        },
      },
    });
    if (existingMember) {
      throw new AppError("CONFLICT", "이미 해당 협회에 연결되어 있습니다.");
    }

    const pending = await prisma.associationGymConnectionRequest.findFirst({
      where: {
        gymId,
        associationOrganizerId,
        status: AssociationGymConnectionRequestStatus.pending,
        deletedAt: null,
      },
    });
    if (pending) {
      throw new AppError("CONFLICT", "이미 승인 대기 중인 연결 요청이 있습니다.");
    }

    return prisma.associationGymConnectionRequest.create({
      data: {
        gymId,
        associationOrganizerId,
        requestingUserId: actor.userId,
        memo: memo?.trim() || null,
        status: AssociationGymConnectionRequestStatus.pending,
      },
      select: { id: true, status: true },
    });
  },

  async cancelRequest(actor: ActorContext, requestId: string) {
    const gymId = resolveOwnedGymId(actor);
    const row = await prisma.associationGymConnectionRequest.findFirst({
      where: { id: requestId, gymId, deletedAt: null },
    });
    if (!row) throw new AppError("NOT_FOUND", "요청을 찾을 수 없습니다.");
    if (row.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "대기 중인 요청만 취소할 수 있습니다.");
    }
    return prisma.associationGymConnectionRequest.update({
      where: { id: requestId },
      data: { status: AssociationGymConnectionRequestStatus.cancelled },
    });
  },

  async listPendingForOrganizer(actor: ActorContext, organizerId: string) {
    requireRole(actor, [UserRole.organizer, UserRole.admin]);
    return prisma.associationGymConnectionRequest.findMany({
      where: {
        associationOrganizerId: organizerId,
        status: AssociationGymConnectionRequestStatus.pending,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        gym: { select: { id: true, name: true, phone: true, address: true } },
        requestingUser: {
          select: { id: true, name: true, phone: true, loginId: true },
        },
      },
    });
  },

  async approve(
    actor: ActorContext,
    requestId: string,
    organizerId: string,
    reviewMemo?: string,
  ) {
    requireRole(actor, [UserRole.organizer, UserRole.admin]);
    const row = await prisma.associationGymConnectionRequest.findFirst({
      where: {
        id: requestId,
        associationOrganizerId: organizerId,
        deletedAt: null,
      },
      include: { gym: true },
    });
    if (!row) throw new AppError("NOT_FOUND", "연결 요청을 찾을 수 없습니다.");
    if (row.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "이미 처리된 요청입니다.");
    }

    const existingMember =
      await memberGymRepository.findMemberGymByOrganizerGym(
        organizerId,
        row.gymId,
      );
    if (existingMember) {
      throw new AppError("CONFLICT", "이미 회원사로 등록된 체육관입니다.");
    }

    const settingsRow = await memberGymRepository.getOrCreateSettings(
      organizerId,
    );
    const settings = parseMemberGymSettings(settingsRow.settingsJson);

    const result = await prisma.$transaction(async (tx) => {
      const next = await memberGymRepository.nextMemberCodeNumber(
        organizerId,
        tx,
      );
      const memberCode = formatMemberCode(
        settings.approval.memberCodePrefix,
        settings.approval.memberCodePadding,
        next,
      );

      const memberGym = await memberGymRepository.createMemberGym(
        {
          organizer: { connect: { id: organizerId } },
          gym: { connect: { id: row.gymId } },
          memberCode,
          status: AssociationMemberGymStatus.active,
          approvedAt: new Date(),
          internalNote: reviewMemo?.trim() || null,
        },
        tx,
      );

      await tx.associationGymConnectionRequest.update({
        where: { id: requestId },
        data: {
          status: AssociationGymConnectionRequestStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: reviewMemo?.trim() || null,
          createdAssociationMemberGymId: memberGym.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationGymConnectionRequest",
          targetId: requestId,
          afterData: {
            status: "approved",
            memberGymId: memberGym.id,
            gymId: row.gymId,
          },
        },
      });

      return { memberGymId: memberGym.id, memberCode };
    });

    return result;
  },

  async reject(
    actor: ActorContext,
    requestId: string,
    organizerId: string,
    reviewMemo?: string,
  ) {
    requireRole(actor, [UserRole.organizer, UserRole.admin]);
    const row = await prisma.associationGymConnectionRequest.findFirst({
      where: {
        id: requestId,
        associationOrganizerId: organizerId,
        deletedAt: null,
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "연결 요청을 찾을 수 없습니다.");
    if (row.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "이미 처리된 요청입니다.");
    }

    await prisma.associationGymConnectionRequest.update({
      where: { id: requestId },
      data: {
        status: AssociationGymConnectionRequestStatus.rejected,
        reviewedAt: new Date(),
        reviewedByUserId: actor.userId,
        reviewMemo: reviewMemo?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.association_gym_connection_reviewed,
        targetType: "AssociationGymConnectionRequest",
        targetId: requestId,
        afterData: { status: "rejected" },
      },
    });
  },
};
