import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymStatus,
  OrganizerStatus,
  OrganizerType,
} from "@/generated/prisma";
import {
  ORGANIZATION_STATUS_REASON_MIN_LENGTH,
  isMutableGymStatusTransition,
  isMutableOrganizerStatusTransition,
  normalizeOrganizationStatusReason,
} from "@/lib/organization-platform-status";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

function assertSuperAdmin(actor: ActorContext): void {
  requireRole(actor, ["admin"]);
}

function assertOrganizationStatusReasonOrThrow(reason: string): void {
  if (
    normalizeOrganizationStatusReason(reason).length <
    ORGANIZATION_STATUS_REASON_MIN_LENGTH
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `사유는 ${ORGANIZATION_STATUS_REASON_MIN_LENGTH}자 이상 입력해 주세요.`,
    );
  }
}

export type UpdateOrganizerStatusInput = {
  organizerId: string;
  nextStatus: OrganizerStatus;
  reason: string;
  adminMemo?: string | null;
};

export type UpdateGymStatusInput = {
  gymId: string;
  nextStatus: GymStatus;
  reason: string;
  adminMemo?: string | null;
};

export const adminOrganizationStatusService = {
  async updateOrganizerStatus(
    actor: ActorContext,
    input: UpdateOrganizerStatusInput,
  ): Promise<{ status: OrganizerStatus }> {
    assertSuperAdmin(actor);

    const reason = normalizeOrganizationStatusReason(input.reason);
    assertOrganizationStatusReasonOrThrow(reason);

    const row = await prisma.organizer.findFirst({
      where: {
        id: input.organizerId.trim(),
        type: OrganizerType.association,
      },
      select: { id: true, status: true },
    });
    if (!row) {
      throw new AppError("NOT_FOUND", "협회를 찾을 수 없습니다.");
    }

    if (row.status === OrganizerStatus.pending) {
      throw new AppError(
        "VALIDATION_ERROR",
        "가입 승인 전(pending) 협회는 운영 상태를 변경할 수 없습니다.",
      );
    }

    if (!isMutableOrganizerStatusTransition(row.status, input.nextStatus)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "허용되지 않는 상태 변경입니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizer.update({
        where: { id: row.id },
        data: { status: input.nextStatus },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.organizer_status_changed,
          targetType: "Organizer",
          targetId: row.id,
          beforeData: { status: row.status },
          afterData: {
            status: input.nextStatus,
            reason,
            adminMemo: input.adminMemo?.trim() || null,
          },
        },
        tx,
      );
    });

    return { status: input.nextStatus };
  },

  async updateGymStatus(
    actor: ActorContext,
    input: UpdateGymStatusInput,
  ): Promise<{ status: GymStatus }> {
    assertSuperAdmin(actor);

    const reason = normalizeOrganizationStatusReason(input.reason);
    assertOrganizationStatusReasonOrThrow(reason);

    const row = await prisma.gym.findUnique({
      where: { id: input.gymId.trim() },
      select: { id: true, status: true },
    });
    if (!row) {
      throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
    }

    if (!isMutableGymStatusTransition(row.status, input.nextStatus)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "허용되지 않는 상태 변경입니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.gym.update({
        where: { id: row.id },
        data: { status: input.nextStatus },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_status_changed,
          targetType: "Gym",
          targetId: row.id,
          beforeData: { status: row.status },
          afterData: {
            status: input.nextStatus,
            reason,
            adminMemo: input.adminMemo?.trim() || null,
          },
        },
        tx,
      );
    });

    return { status: input.nextStatus };
  },
};
