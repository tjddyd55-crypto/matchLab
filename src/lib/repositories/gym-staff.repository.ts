/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 *
 * 선생님(GymStaff) + 담당 회원(GymStaffMemberAssignment) 영속화 계층.
 * 권한 판단·정책(대표 담당 유일성 등)은 service가 책임진다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const staffListSelect = {
  id: true,
  gymId: true,
  userId: true,
  name: true,
  phone: true,
  normalizedPhone: true,
  email: true,
  staffRole: true,
  title: true,
  profileImagePath: true,
  colorKey: true,
  isActive: true,
  createdAt: true,
  user: { select: { id: true, loginId: true } },
  _count: {
    select: {
      memberAssignments: { where: { deletedAt: null, endedAt: null } },
    },
  },
} satisfies Prisma.GymStaffSelect;

export type GymStaffListRow = Prisma.GymStaffGetPayload<{
  select: typeof staffListSelect;
}>;

const assignmentSelect = {
  id: true,
  gymId: true,
  gymStaffId: true,
  gymMemberId: true,
  assignmentType: true,
  isPrimary: true,
  startedAt: true,
  endedAt: true,
  memo: true,
  gymMember: {
    select: {
      id: true,
      memberNumber: true,
      name: true,
      phone: true,
      status: true,
      profileImagePath: true,
    },
  },
} satisfies Prisma.GymStaffMemberAssignmentSelect;

export type GymStaffAssignmentRow =
  Prisma.GymStaffMemberAssignmentGetPayload<{ select: typeof assignmentSelect }>;

export type GymStaffListFilters = {
  gymId: string;
  q?: string;
  /** 기본은 재직 중만 노출 */
  includeInactive?: boolean;
  skip?: number;
  take?: number;
};

export const gymStaffRepository = {
  async list(
    filters: GymStaffListFilters,
  ): Promise<{ rows: GymStaffListRow[]; total: number }> {
    const q = filters.q?.trim();
    const where: Prisma.GymStaffWhereInput = {
      gymId: filters.gymId,
      deletedAt: null,
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { normalizedPhone: { contains: q.replace(/\D/g, "") } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.gymStaff.findMany({
        where,
        select: staffListSelect,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      prisma.gymStaff.count({ where }),
    ]);

    return { rows, total };
  },

  async findByIdForGym(
    staffId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaff.findFirst({
      where: { id: staffId, gymId, deletedAt: null },
      select: staffListSelect,
    });
  },

  async findActiveByNormalizedPhone(
    gymId: string,
    normalizedPhone: string,
    excludeStaffId?: string,
  ) {
    return prisma.gymStaff.findFirst({
      where: {
        gymId,
        normalizedPhone,
        deletedAt: null,
        ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
      },
      select: { id: true, name: true },
    });
  },

  async create(data: Prisma.GymStaffCreateInput, tx?: Prisma.TransactionClient) {
    return db(tx).gymStaff.create({
      data,
      select: { id: true, name: true, profileImagePath: true },
    });
  },

  async update(
    staffId: string,
    data: Prisma.GymStaffUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaff.update({
      where: { id: staffId },
      data,
      select: { id: true, profileImagePath: true },
    });
  },

  /**
   * 재직 종료 — 이력 보존을 위해 soft delete 대신 isActive=false + deletedAt.
   * 계정(User) 자체는 별도 정책이며 여기서 삭제하지 않는다.
   */
  async deactivate(staffId: string, tx?: Prisma.TransactionClient) {
    return db(tx).gymStaff.update({
      where: { id: staffId },
      data: { isActive: false, deletedAt: new Date() },
      select: { id: true },
    });
  },

  async linkUserId(
    tx: Prisma.TransactionClient,
    staffId: string,
    userId: string,
  ) {
    await tx.gymStaff.update({
      where: { id: staffId },
      data: { userId },
    });
  },

  async listAssignmentsForStaff(
    staffId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<GymStaffAssignmentRow[]> {
    return db(tx).gymStaffMemberAssignment.findMany({
      where: { gymStaffId: staffId, deletedAt: null, endedAt: null },
      select: assignmentSelect,
      orderBy: [{ isPrimary: "desc" }, { startedAt: "desc" }],
    });
  },

  async listAssignmentsForMember(
    gymMemberId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaffMemberAssignment.findMany({
      where: { gymMemberId, deletedAt: null, endedAt: null },
      select: {
        id: true,
        assignmentType: true,
        isPrimary: true,
        gymStaff: {
          select: { id: true, name: true, staffRole: true, isActive: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { startedAt: "desc" }],
    });
  },

  async findActiveAssignment(
    input: { gymStaffId: string; gymMemberId: string },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaffMemberAssignment.findFirst({
      where: {
        gymStaffId: input.gymStaffId,
        gymMemberId: input.gymMemberId,
        deletedAt: null,
        endedAt: null,
      },
      select: { id: true, isPrimary: true },
    });
  },

  async findAssignmentByIdForGym(
    assignmentId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaffMemberAssignment.findFirst({
      where: { id: assignmentId, gymId, deletedAt: null },
      select: {
        id: true,
        gymStaffId: true,
        gymMemberId: true,
        isPrimary: true,
        endedAt: true,
      },
    });
  },

  async createAssignment(
    data: Prisma.GymStaffMemberAssignmentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaffMemberAssignment.create({
      data,
      select: { id: true },
    });
  },

  async updateAssignment(
    assignmentId: string,
    data: Prisma.GymStaffMemberAssignmentUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).gymStaffMemberAssignment.update({
      where: { id: assignmentId },
      data,
      select: { id: true },
    });
  },

  /** 담당 해제 — 이력 보존 (endedAt + deletedAt) */
  async endAssignment(assignmentId: string, tx?: Prisma.TransactionClient) {
    const now = new Date();
    return db(tx).gymStaffMemberAssignment.update({
      where: { id: assignmentId },
      data: { endedAt: now, deletedAt: now, isPrimary: false },
      select: { id: true },
    });
  },

  /** 같은 회원의 다른 대표 담당을 해제 (대표는 회원당 1명) */
  async clearOtherPrimaryAssignments(
    input: { gymId: string; gymMemberId: string; exceptAssignmentId?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await db(tx).gymStaffMemberAssignment.updateMany({
      where: {
        gymId: input.gymId,
        gymMemberId: input.gymMemberId,
        isPrimary: true,
        deletedAt: null,
        endedAt: null,
        ...(input.exceptAssignmentId
          ? { id: { not: input.exceptAssignmentId } }
          : {}),
      },
      data: { isPrimary: false },
    });
    return result.count;
  },

  async countSummary(gymId: string) {
    const [total, active, withAccount] = await Promise.all([
      prisma.gymStaff.count({ where: { gymId, deletedAt: null } }),
      prisma.gymStaff.count({
        where: { gymId, deletedAt: null, isActive: true },
      }),
      prisma.gymStaff.count({
        where: { gymId, deletedAt: null, userId: { not: null } },
      }),
    ]);
    return { total, active, withAccount, withoutAccount: total - withAccount };
  },
};
