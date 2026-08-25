import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import {
  AssociationGymConnectionRequestStatus,
  AssociationMemberGymStatus,
  AuditAction,
  OrganizerStatus,
  OrganizerType,
} from "@/lib/enums";
import {
  isGymPortalOwner,
  requireGymOwner,
  requireRole,
  requireAssociationOrganizerScope,
} from "@/lib/permissions";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { prisma } from "@/lib/prisma";
import { parseMemberGymSettings } from "@/lib/member-gym/settings";

function formatMemberCode(prefix: string, padding: number, n: number): string {
  return `${prefix}${String(n).padStart(padding, "0")}`;
}

/** 협회 요청 UI용 고정 타임존 라벨 (Asia/Seoul) */
function formatKstDateTime(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" ", " ")
    .replace(/-/g, ".");
}

export type GymAssociationMembershipView = {
  kind: "membership" | "request";
  id: string;
  associationOrganizerId: string;
  associationName: string;
  statusLabel:
    | "가입 완료"
    | "승인 대기"
    | "가입 거절"
    | "연결 해제"
    | "요청 취소";
  statusCode: string;
  requestedAt: string | null;
  approvedAt: string | null;
  canCancelRequest: boolean;
  canDisconnect: boolean;
  canReRequest: boolean;
};

export const gymAssociationConnectionService = {
  async listMembershipsForGym(
    actor: ActorContext,
  ): Promise<GymAssociationMembershipView[]> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) throw new PermissionError("FORBIDDEN", "체육관이 필요합니다.");
    await requireGymOwner(actor, gymId);

    const [memberships, requests] = await Promise.all([
      prisma.associationMemberGym.findMany({
        where: { gymId },
        include: { organizer: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.associationGymConnectionRequest.findMany({
        where: { gymId, deletedAt: null },
        include: {
          associationOrganizer: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const views: GymAssociationMembershipView[] = [];

    for (const m of memberships) {
      const withdrawn = m.status === AssociationMemberGymStatus.withdrawn;
      views.push({
        kind: "membership",
        id: m.id,
        associationOrganizerId: m.organizerId,
        associationName: m.organizer.name,
        statusLabel: withdrawn
          ? "연결 해제"
          : m.status === AssociationMemberGymStatus.suspended
            ? "가입 완료"
            : "가입 완료",
        statusCode: m.status,
        requestedAt: null,
        approvedAt: m.approvedAt?.toISOString() ?? m.joinedAt.toISOString(),
        canCancelRequest: false,
        canDisconnect:
          !withdrawn &&
          (m.status === AssociationMemberGymStatus.active ||
            m.status === AssociationMemberGymStatus.suspended ||
            m.status === AssociationMemberGymStatus.on_hold ||
            m.status === AssociationMemberGymStatus.pending),
        canReRequest: withdrawn,
      });
    }

    const activeOrganizerIds = new Set(
      memberships
        .filter((m) => m.status !== AssociationMemberGymStatus.withdrawn)
        .map((m) => m.organizerId),
    );

    for (const r of requests) {
      if (activeOrganizerIds.has(r.associationOrganizerId)) continue;
      const pending =
        r.status === AssociationGymConnectionRequestStatus.pending;
      const rejected =
        r.status === AssociationGymConnectionRequestStatus.rejected;
      const cancelled =
        r.status === AssociationGymConnectionRequestStatus.cancelled ||
        r.status === AssociationGymConnectionRequestStatus.withdrawn;
      views.push({
        kind: "request",
        id: r.id,
        associationOrganizerId: r.associationOrganizerId,
        associationName: r.associationOrganizer.name,
        statusLabel: pending
          ? "승인 대기"
          : rejected
            ? "가입 거절"
            : "요청 취소",
        statusCode: r.status,
        requestedAt: r.createdAt.toISOString(),
        approvedAt: null,
        canCancelRequest: pending,
        canDisconnect: false,
        canReRequest: rejected || cancelled,
      });
    }

    return views;
  },

  async listAvailableAssociations(actor: ActorContext) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) throw new PermissionError("FORBIDDEN", "체육관이 필요합니다.");
    await requireGymOwner(actor, gymId);

    const [allAssociations, memberships, pending] = await Promise.all([
      prisma.organizer.findMany({
        where: {
          type: OrganizerType.association,
          status: OrganizerStatus.active,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.associationMemberGym.findMany({
        where: {
          gymId,
          status: { not: AssociationMemberGymStatus.withdrawn },
        },
        select: { organizerId: true },
      }),
      prisma.associationGymConnectionRequest.findMany({
        where: {
          gymId,
          deletedAt: null,
          status: AssociationGymConnectionRequestStatus.pending,
        },
        select: { associationOrganizerId: true },
      }),
    ]);

    const blocked = new Set([
      ...memberships.map((m) => m.organizerId),
      ...pending.map((p) => p.associationOrganizerId),
    ]);

    return allAssociations
      .filter((a) => !blocked.has(a.id))
      .map((a) => ({ id: a.id, name: a.name }));
  },

  async requestConnection(
    actor: ActorContext,
    associationOrganizerId: string,
    memo?: string,
  ) {
    requireRole(actor, ["gym", "admin"]);
    if (!isGymPortalOwner(actor) && actor.role !== "admin") {
      throw new PermissionError("FORBIDDEN", "관장만 가입 요청할 수 있습니다.");
    }
    const gymId = actor.gymId;
    if (!gymId) throw new PermissionError("FORBIDDEN", "체육관이 필요합니다.");
    await requireGymOwner(actor, gymId);

    const association = await prisma.organizer.findFirst({
      where: {
        id: associationOrganizerId,
        type: OrganizerType.association,
        status: OrganizerStatus.active,
      },
      select: { id: true, name: true },
    });
    if (!association) {
      throw new AppError("NOT_FOUND", "협회를 찾을 수 없습니다.");
    }

    const existingMember =
      await memberGymRepository.findMemberGymByOrganizerGym(
        associationOrganizerId,
        gymId,
      );
    if (
      existingMember &&
      existingMember.status !== AssociationMemberGymStatus.withdrawn
    ) {
      throw new AppError("CONFLICT", "이미 해당 협회에 가입되어 있습니다.");
    }

    // soft-delete 포함 동일 조합 1건을 재사용해 중복 row를 만들지 않는다.
    const existingRequest =
      await prisma.associationGymConnectionRequest.findFirst({
        where: {
          gymId,
          associationOrganizerId,
        },
        orderBy: { updatedAt: "desc" },
      });

    if (
      existingRequest?.status === AssociationGymConnectionRequestStatus.pending
    ) {
      throw new AppError("CONFLICT", "이미 승인 대기 중인 요청이 있습니다.");
    }

    const row = await prisma.$transaction(async (tx) => {
      let request;
      if (existingRequest) {
        request = await tx.associationGymConnectionRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: AssociationGymConnectionRequestStatus.pending,
            memo: memo?.trim() || null,
            requestingUserId: actor.userId,
            reviewedAt: null,
            reviewedByUserId: null,
            reviewMemo: null,
            createdAssociationMemberGymId: null,
            deletedAt: null,
          },
        });
      } else {
        request = await tx.associationGymConnectionRequest.create({
          data: {
            gymId,
            associationOrganizerId,
            requestingUserId: actor.userId,
            status: AssociationGymConnectionRequestStatus.pending,
            memo: memo?.trim() || null,
          },
        });
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationGymConnectionRequest",
          targetId: request.id,
          beforeData: existingRequest
            ? { status: existingRequest.status }
            : null,
          afterData: { status: "pending", gymId, associationOrganizerId },
        },
        tx,
      );
      return request;
    });

    return { requestId: row.id };
  },

  async cancelRequest(actor: ActorContext, requestId: string) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) throw new PermissionError("FORBIDDEN", "체육관이 필요합니다.");
    await requireGymOwner(actor, gymId);

    const request = await prisma.associationGymConnectionRequest.findFirst({
      where: { id: requestId, gymId, deletedAt: null },
    });
    if (!request) throw new AppError("NOT_FOUND", "요청을 찾을 수 없습니다.");
    if (request.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "대기 중인 요청만 취소할 수 있습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.associationGymConnectionRequest.update({
        where: { id: request.id },
        data: {
          status: AssociationGymConnectionRequestStatus.cancelled,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationGymConnectionRequest",
          targetId: request.id,
          beforeData: { status: request.status },
          afterData: { status: "cancelled" },
        },
        tx,
      );
    });
  },

  async disconnectMembership(actor: ActorContext, memberGymId: string) {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) throw new PermissionError("FORBIDDEN", "체육관이 필요합니다.");
    await requireGymOwner(actor, gymId);

    const member = await prisma.associationMemberGym.findFirst({
      where: { id: memberGymId, gymId },
    });
    if (!member) throw new AppError("NOT_FOUND", "가입 정보를 찾을 수 없습니다.");
    if (member.status === AssociationMemberGymStatus.withdrawn) {
      throw new AppError("CONFLICT", "이미 연결 해제된 상태입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.associationMemberGym.update({
        where: { id: member.id },
        data: {
          status: AssociationMemberGymStatus.withdrawn,
          withdrawnAt: new Date(),
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationMemberGym",
          targetId: member.id,
          beforeData: { status: member.status },
          afterData: { status: "withdrawn", by: "gym" },
        },
        tx,
      );
    });
  },

  async listRequestsForAssociation(
    actor: ActorContext,
    statusFilter?: AssociationGymConnectionRequestStatus | "all",
  ) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const where = {
      associationOrganizerId: organizerId,
      deletedAt: null,
      ...(statusFilter && statusFilter !== "all"
        ? { status: statusFilter }
        : {}),
    };

    const rows = await prisma.associationGymConnectionRequest.findMany({
      where,
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            ownerUser: { select: { name: true, phone: true } },
          },
        },
        requestingUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      memo: r.memo,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      // SSR/CSR 타임존 불일치(#418) 방지 — 서버에서 KST 라벨 고정
      createdAtLabel: formatKstDateTime(r.createdAt),
      reviewedAtLabel: r.reviewedAt ? formatKstDateTime(r.reviewedAt) : null,
      gym: {
        id: r.gym.id,
        name: r.gym.name,
        phone: r.gym.phone,
        address: r.gym.address,
        ownerName: r.gym.ownerUser?.name ?? r.requestingUser.name,
        ownerPhone: r.gym.ownerUser?.phone ?? null,
      },
    }));
  },

  async approveRequest(actor: ActorContext, requestId: string, note?: string) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const request = await prisma.associationGymConnectionRequest.findFirst({
      where: {
        id: requestId,
        associationOrganizerId: organizerId,
        deletedAt: null,
      },
    });
    if (!request) throw new AppError("NOT_FOUND", "요청을 찾을 수 없습니다.");
    if (request.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "대기 중인 요청만 승인할 수 있습니다.");
    }

    const settings = parseMemberGymSettings(
      (await memberGymRepository.getOrCreateSettings(organizerId)).settingsJson,
    );

    return prisma.$transaction(async (tx) => {
      const existing = await memberGymRepository.findMemberGymByOrganizerGym(
        organizerId,
        request.gymId,
        tx,
      );

      let memberGymId: string;
      if (existing) {
        if (existing.status !== AssociationMemberGymStatus.withdrawn) {
          throw new AppError(
            "CONFLICT",
            "이미 해당 체육관이 회원사로 등록되어 있습니다.",
          );
        }
        const restored = await tx.associationMemberGym.update({
          where: { id: existing.id },
          data: {
            status: AssociationMemberGymStatus.active,
            approvedAt: new Date(),
            withdrawnAt: null,
            suspendedAt: null,
            ownerAccessSuspendedAt: null,
            internalNote: note?.trim() || existing.internalNote,
          },
        });
        memberGymId = restored.id;
      } else {
        const next = await memberGymRepository.nextMemberCodeNumber(
          organizerId,
          tx,
        );
        const memberCode = formatMemberCode(
          settings.approval.memberCodePrefix,
          settings.approval.memberCodePadding,
          next,
        );
        const created = await memberGymRepository.createMemberGym(
          {
            organizer: { connect: { id: organizerId } },
            gym: { connect: { id: request.gymId } },
            memberCode,
            status: AssociationMemberGymStatus.active,
            approvedAt: new Date(),
            internalNote: note?.trim() || null,
          },
          tx,
        );
        memberGymId = created.id;
      }

      await tx.associationGymConnectionRequest.update({
        where: { id: request.id },
        data: {
          status: AssociationGymConnectionRequestStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: note?.trim() || null,
          createdAssociationMemberGymId: memberGymId,
        },
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationGymConnectionRequest",
          targetId: request.id,
          beforeData: { status: request.status },
          afterData: { status: "approved", memberGymId },
        },
        tx,
      );

      return { memberGymId };
    });
  },

  async rejectRequest(actor: ActorContext, requestId: string, note?: string) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const request = await prisma.associationGymConnectionRequest.findFirst({
      where: {
        id: requestId,
        associationOrganizerId: organizerId,
        deletedAt: null,
      },
    });
    if (!request) throw new AppError("NOT_FOUND", "요청을 찾을 수 없습니다.");
    if (request.status !== AssociationGymConnectionRequestStatus.pending) {
      throw new AppError("CONFLICT", "대기 중인 요청만 거절할 수 있습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.associationGymConnectionRequest.update({
        where: { id: request.id },
        data: {
          status: AssociationGymConnectionRequestStatus.rejected,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: note?.trim() || null,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationGymConnectionRequest",
          targetId: request.id,
          beforeData: { status: request.status },
          afterData: { status: "rejected" },
        },
        tx,
      );
    });
  },

  async disconnectByAssociation(actor: ActorContext, memberGymId: string) {
    const organizerId = await requireAssociationOrganizerScope(actor);
    const member = await prisma.associationMemberGym.findFirst({
      where: { id: memberGymId, organizerId },
    });
    if (!member) throw new AppError("NOT_FOUND", "회원사를 찾을 수 없습니다.");
    if (member.status === AssociationMemberGymStatus.withdrawn) {
      throw new AppError("CONFLICT", "이미 연결 해제된 상태입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.associationMemberGym.update({
        where: { id: member.id },
        data: {
          status: AssociationMemberGymStatus.withdrawn,
          withdrawnAt: new Date(),
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.association_gym_connection_reviewed,
          targetType: "AssociationMemberGym",
          targetId: member.id,
          beforeData: { status: member.status },
          afterData: { status: "withdrawn", by: "association" },
        },
        tx,
      );
    });
  },
};
