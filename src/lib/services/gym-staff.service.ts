/**
 * 선생님(직원) 관리 — 체육관 관장 전용 쓰기, 담당 회원 배정 정책 포함.
 *
 * 권한 경계:
 * - 조회/쓰기 모두 `requireGymPortalOwnerManage` (Stage 1에서 gym_staff는 직원 관리 불가).
 * - 모든 조회는 access.gymId 범위로만 수행한다.
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  AuditAction,
  GymStaffAssignmentType,
  GymStaffRole,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import {
  GYM_STAFF_ASSIGNMENT_TYPE_LABEL,
  getGymStaffRoleLabel,
} from "@/lib/gym-staff/labels";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import { requireGymPortalOwnerManage, requireGymPortalRead } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { gymStaffRepository } from "@/lib/repositories/gym-staff.repository";
import type {
  GymStaffAssignmentCreateInput,
  GymStaffCreateInput,
  GymStaffUpdateInput,
} from "@/lib/validators/gym-staff.validator";

export type { GymStaffCreateInput, GymStaffUpdateInput };

export type GymStaffListItemVM = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  staffRole: GymStaffRole;
  staffRoleLabel: string;
  title: string | null;
  isActive: boolean;
  loginId: string | null;
  hasAccount: boolean;
  assignedMemberCount: number;
};

export type GymStaffAssignmentVM = {
  id: string;
  gymMemberId: string;
  memberName: string;
  memberNumber: string;
  memberStatus: string;
  assignmentType: GymStaffAssignmentType;
  assignmentTypeLabel: string;
  isPrimary: boolean;
  startedAt: Date;
  memo: string | null;
};

function toListItemVM(row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  staffRole: GymStaffRole;
  title: string | null;
  isActive: boolean;
  userId: string | null;
  user: { id: string; loginId: string | null } | null;
  _count: { memberAssignments: number };
}): GymStaffListItemVM {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    staffRole: row.staffRole,
    staffRoleLabel: getGymStaffRoleLabel(row.staffRole),
    title: row.title,
    isActive: row.isActive,
    loginId: row.user?.loginId ?? null,
    hasAccount: Boolean(row.userId && row.user?.loginId),
    assignedMemberCount: row._count.memberAssignments,
  };
}

function toAssignmentVM(row: {
  id: string;
  gymMemberId: string;
  assignmentType: GymStaffAssignmentType;
  isPrimary: boolean;
  startedAt: Date;
  memo: string | null;
  gymMember: {
    name: string;
    memberNumber: string;
    status: string;
  };
}): GymStaffAssignmentVM {
  return {
    id: row.id,
    gymMemberId: row.gymMemberId,
    memberName: row.gymMember.name,
    memberNumber: row.gymMember.memberNumber,
    memberStatus: row.gymMember.status,
    assignmentType: row.assignmentType,
    assignmentTypeLabel: GYM_STAFF_ASSIGNMENT_TYPE_LABEL[row.assignmentType],
    isPrimary: row.isPrimary,
    startedAt: row.startedAt,
    memo: row.memo,
  };
}

async function assertStaffOwned(actor: ActorContext, staffId: string) {
  const access = await requireGymPortalOwnerManage(actor);
  const staff = await gymStaffRepository.findByIdForGym(staffId, access.gymId);
  if (!staff) {
    throw new AppError("NOT_FOUND", "선생님을 찾을 수 없습니다.");
  }
  return { access, staff };
}

function normalizeStaffPhone(raw: string): string {
  const phone = normalizeGymFighterPhone(raw);
  if (!phone) {
    throw new AppError("VALIDATION_ERROR", "휴대전화번호를 입력해 주세요.");
  }
  return phone;
}

export const gymStaffService = {
  async getSummary(actor: ActorContext) {
    const access = await requireGymPortalOwnerManage(actor);
    return gymStaffRepository.countSummary(access.gymId);
  },

  async listStaff(
    actor: ActorContext,
    filters: {
      q?: string;
      includeInactive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    items: GymStaffListItemVM[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const access = await requireGymPortalOwnerManage(actor);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));

    const { rows, total } = await gymStaffRepository.list({
      gymId: access.gymId,
      q: filters.q,
      includeInactive: filters.includeInactive,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items: rows.map(toListItemVM), total, page, pageSize };
  },

  async getStaffDetail(
    actor: ActorContext,
    staffId: string,
  ): Promise<{
    staff: GymStaffListItemVM;
    assignments: GymStaffAssignmentVM[];
  }> {
    const { staff } = await assertStaffOwned(actor, staffId);
    const assignments =
      await gymStaffRepository.listAssignmentsForStaff(staffId);
    return {
      staff: toListItemVM(staff),
      assignments: assignments.map(toAssignmentVM),
    };
  },

  async createStaff(
    actor: ActorContext,
    input: GymStaffCreateInput,
  ): Promise<{ staffId: string }> {
    const access = await requireGymPortalOwnerManage(actor);
    const phone = normalizeStaffPhone(input.phone);

    const duplicate = await gymStaffRepository.findActiveByNormalizedPhone(
      access.gymId,
      phone,
    );
    if (duplicate) {
      throw new AppError(
        "CONFLICT",
        `같은 연락처의 선생님(${duplicate.name})이 이미 등록되어 있습니다.`,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const staff = await gymStaffRepository.create(
        {
          gym: { connect: { id: access.gymId } },
          name: input.name.trim(),
          phone,
          normalizedPhone: phone,
          email: input.email ?? null,
          staffRole: input.staffRole ?? GymStaffRole.instructor,
          title: input.title ?? null,
          colorKey: input.colorKey ?? null,
        },
        tx,
      );

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_created,
          targetType: "GymStaff",
          targetId: staff.id,
          afterData: {
            name: staff.name,
            staffRole: input.staffRole ?? GymStaffRole.instructor,
          },
        },
        tx,
      );

      return staff;
    });

    return { staffId: created.id };
  },

  async updateStaff(
    actor: ActorContext,
    staffId: string,
    input: GymStaffUpdateInput,
  ): Promise<void> {
    const { access } = await assertStaffOwned(actor, staffId);
    const phone = normalizeStaffPhone(input.phone);

    const duplicate = await gymStaffRepository.findActiveByNormalizedPhone(
      access.gymId,
      phone,
      staffId,
    );
    if (duplicate) {
      throw new AppError(
        "CONFLICT",
        `같은 연락처의 선생님(${duplicate.name})이 이미 등록되어 있습니다.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await gymStaffRepository.update(
        staffId,
        {
          name: input.name.trim(),
          phone,
          normalizedPhone: phone,
          email: input.email ?? null,
          staffRole: input.staffRole ?? GymStaffRole.instructor,
          title: input.title ?? null,
          colorKey: input.colorKey ?? null,
          isActive: input.isActive,
        },
        tx,
      );

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_updated,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: { name: input.name.trim(), isActive: input.isActive },
        },
        tx,
      );
    });
  },

  /**
   * 재직 종료. 담당 회원 배정도 함께 종료해 "퇴사한 선생님이 담당으로 남는" 상태를 막는다.
   * 연결된 로그인 계정은 여기서 삭제하지 않는다 (계정 정책은 별도 화면).
   */
  async deactivateStaff(actor: ActorContext, staffId: string): Promise<void> {
    const { access } = await assertStaffOwned(actor, staffId);

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.gymStaffMemberAssignment.updateMany({
        where: { gymStaffId: staffId, gymId: access.gymId, deletedAt: null },
        data: { endedAt: now, deletedAt: now, isPrimary: false },
      });
      await gymStaffRepository.deactivate(staffId, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_deactivated,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: { op: "deactivate" },
        },
        tx,
      );
    });
  },

  /** 담당 배정 후보 회원 (이름·연락처·회원번호 검색) */
  async listAssignableMembers(actor: ActorContext, q?: string) {
    const access = await requireGymPortalOwnerManage(actor);
    const { rows } = await gymMemberRepository.list({
      gymId: access.gymId,
      q,
      take: 30,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      memberNumber: r.memberNumber,
      phone: r.phone,
    }));
  },

  /**
   * 담당 배정. 대표 담당(isPrimary)은 회원당 1명만 유지한다.
   * 같은 선생님-회원 조합이 이미 활성 상태면 배정 정보만 갱신한다.
   */
  async assignMember(
    actor: ActorContext,
    staffId: string,
    input: GymStaffAssignmentCreateInput,
  ): Promise<{ assignmentId: string }> {
    const { access } = await assertStaffOwned(actor, staffId);

    const member = await gymMemberRepository.findImageContextForGym(
      input.gymMemberId,
      access.gymId,
    );
    if (!member) {
      throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }

    const assignmentType = input.assignmentType ?? GymStaffAssignmentType.GENERAL;

    const assignmentId = await prisma.$transaction(async (tx) => {
      const existing = await gymStaffRepository.findActiveAssignment(
        { gymStaffId: staffId, gymMemberId: member.id },
        tx,
      );

      const id = existing
        ? (
            await gymStaffRepository.updateAssignment(
              existing.id,
              {
                assignmentType,
                isPrimary: input.isPrimary,
                memo: input.memo ?? null,
              },
              tx,
            )
          ).id
        : (
            await gymStaffRepository.createAssignment(
              {
                gymId: access.gymId,
                gymStaffId: staffId,
                gymMemberId: member.id,
                assignmentType,
                isPrimary: input.isPrimary,
                memo: input.memo ?? null,
              },
              tx,
            )
          ).id;

      if (input.isPrimary) {
        await gymStaffRepository.clearOtherPrimaryAssignments(
          {
            gymId: access.gymId,
            gymMemberId: member.id,
            exceptAssignmentId: id,
          },
          tx,
        );
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_member_assigned,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: {
            gymMemberId: member.id,
            assignmentType,
            isPrimary: input.isPrimary,
            mode: existing ? "update" : "create",
          },
        },
        tx,
      );

      return id;
    });

    return { assignmentId };
  },

  async unassignMember(
    actor: ActorContext,
    staffId: string,
    assignmentId: string,
  ): Promise<void> {
    const { access } = await assertStaffOwned(actor, staffId);
    const assignment = await gymStaffRepository.findAssignmentByIdForGym(
      assignmentId,
      access.gymId,
    );
    if (!assignment || assignment.gymStaffId !== staffId) {
      throw new AppError("NOT_FOUND", "담당 배정을 찾을 수 없습니다.");
    }
    if (assignment.endedAt) {
      throw new AppError("CONFLICT", "이미 해제된 담당 배정입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await gymStaffRepository.endAssignment(assignmentId, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_staff_member_unassigned,
          targetType: "GymStaff",
          targetId: staffId,
          afterData: { gymMemberId: assignment.gymMemberId, assignmentId },
        },
        tx,
      );
    });
  },

  /** 회원 상세에서 담당 선생님 표시용 — owner/staff 읽기, 변경은 owner 전용 actions */
  async listAssignmentsForMember(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalRead(actor);
    const member = await gymMemberRepository.findImageContextForGym(
      memberId,
      access.gymId,
    );
    if (!member) {
      throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    }
    const rows = await gymStaffRepository.listAssignmentsForMember(memberId);
    return rows.map((r) => ({
      id: r.id,
      staffId: r.gymStaff.id,
      staffName: r.gymStaff.name,
      staffTitle: r.gymStaff.title,
      staffRoleLabel: getGymStaffRoleLabel(r.gymStaff.staffRole),
      assignmentTypeLabel: GYM_STAFF_ASSIGNMENT_TYPE_LABEL[r.assignmentType],
      isPrimary: r.isPrimary,
      startedAt: r.startedAt,
      colorKey: r.gymStaff.colorKey,
    }));
  },
};
