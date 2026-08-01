/**
 * 그룹수업 SSOT.
 * - UTC 저장 / Asia/Seoul 표시 · 10분 슬롯 · 당일만
 * - capacity/waitlist + advisory lock
 * - 완료 시 출석·매출·이용권 자동 연동 금지
 * - GymMemberAttendance 와 완전 분리
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { PermissionError } from "@/lib/auth/permission-error";
import type { Prisma } from "@/generated/prisma";
import {
  AuditAction,
  GymGroupClassParticipationStatus,
  GymGroupClassStatus,
  GymGroupClassVisibility,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import {
  canManageGymGroupClass,
  requireGymGroupClassManageParticipants,
  requireGymGroupClassRead,
  requireGymGroupClassWrite,
  type GymGroupClassAccess,
} from "@/lib/gym-group-class/access";
import {
  GYM_GROUP_CLASS_CAPACITY_MAX,
  GYM_GROUP_CLASS_PARTICIPATION_STATUS_LABEL,
  GYM_GROUP_CLASS_STATUS_LABEL,
  GYM_GROUP_CLASS_VISIBILITY_LABEL,
} from "@/lib/gym-group-class/labels";
import { findFirstOverlap } from "@/lib/gym-schedule/overlap";
import {
  SCHEDULE_MAX_DURATION_MS,
  SCHEDULE_MIN_DURATION_MS,
  assertTenMinuteInstant,
  createSeoulDateTime,
  formatSeoulScheduleRange,
  getSeoulDayRange,
  getSeoulScheduleMonthRange,
  getSeoulScheduleWeekRange,
  getSeoulYmdParts,
  isSameSeoulCalendarDay,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymGroupClassRepository } from "@/lib/repositories/gym-group-class.repository";
import { gymScheduleRepository } from "@/lib/repositories/gym-schedule.repository";
import { createGymMemberImageSignedReadUrlMap } from "@/lib/services/gym-member-image.service";
import type {
  GymGroupClassCreateInput,
  GymGroupClassUpdateInput,
} from "@/lib/validators/gym-group-class.validator";
import { formatPhoneNumber } from "@/lib/phone";
import type { GymCalendarItem } from "@/lib/gym-schedule/calendar-item";

const GROUP_CLASS_TX = { maxWait: 10_000, timeout: 25_000 } as const;

export type GymGroupClassVM = {
  id: string;
  gymId: string;
  title: string;
  description: string | null;
  instructorStaffId: string | null;
  instructorName: string | null;
  startsAt: Date;
  endsAt: Date;
  dateKey: string;
  timeRangeLabel: string;
  capacity: number | null;
  attendingCount: number;
  waitlistCount: number;
  location: string | null;
  status: GymGroupClassStatus;
  statusLabel: string;
  visibility: GymGroupClassVisibility;
  visibilityLabel: string;
  colorKey: string | null;
  capacityExceeded: boolean;
  canManage: boolean;
};

export type GymGroupClassParticipantVM = {
  id: string;
  gymMemberId: string;
  memberName: string;
  memberNumber: string;
  phoneMasked: string;
  memberStatus: string;
  profileImageUrl: string | null;
  status: GymGroupClassParticipationStatus;
  statusLabel: string;
  waitlistOrder: number | null;
  displayWaitlistOrder: number | null;
  respondedAt: Date;
  cancelledAt: Date | null;
};

function parseSlotTimes(input: { dateKey: string; startHm: string; endHm: string }) {
  const startsAt = createSeoulDateTime(input.dateKey, input.startHm);
  const endsAt = createSeoulDateTime(input.dateKey, input.endHm);
  try {
    assertTenMinuteInstant(startsAt, "시작");
    assertTenMinuteInstant(endsAt, "종료");
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "시작·종료 시각은 10분 단위로만 설정할 수 있습니다.",
    );
  }
  if (!isSameSeoulCalendarDay(startsAt, endsAt)) {
    throw new AppError("VALIDATION_ERROR", "날짜를 넘기는 일정은 등록할 수 없습니다.");
  }
  const dur = endsAt.getTime() - startsAt.getTime();
  if (dur < SCHEDULE_MIN_DURATION_MS) {
    throw new AppError("VALIDATION_ERROR", "일정은 최소 10분 이상이어야 합니다.");
  }
  if (dur > SCHEDULE_MAX_DURATION_MS) {
    throw new AppError("VALIDATION_ERROR", "일정은 최대 8시간까지 등록할 수 있습니다.");
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError("VALIDATION_ERROR", "종료 시각은 시작 시각보다 이후여야 합니다.");
  }
  return { startsAt, endsAt };
}

async function lockGroupClass(
  tx: { $executeRaw: typeof prisma.$executeRaw },
  gymGroupClassId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ggc:${gymGroupClassId}`}))`;
}

function assertCanManageClass(
  access: GymGroupClassAccess,
  instructorStaffId: string | null,
) {
  if (!canManageGymGroupClass(access, instructorStaffId)) {
    throw new PermissionError(
      "FORBIDDEN",
      "다른 선생님의 그룹수업은 수정할 수 없습니다.",
    );
  }
}

function resolveInstructorForCreate(
  access: GymGroupClassAccess,
  requested: string | null | undefined,
): string | null {
  const id = requested?.trim() || null;
  if (access.isOwner) return id;
  if (!access.gymStaffId) {
    throw new PermissionError("FORBIDDEN", "담당 선생님 정보가 없습니다.");
  }
  if (!id || id !== access.gymStaffId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "선생님은 자기 자신을 담당자로만 그룹수업을 등록할 수 있습니다.",
    );
  }
  return access.gymStaffId;
}

async function assertActiveInstructor(gymId: string, staffId: string | null) {
  if (!staffId) return;
  const staff = await prisma.gymStaff.findFirst({
    where: { id: staffId, gymId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!staff) {
    throw new AppError("VALIDATION_ERROR", "활성 선생님만 담당자로 지정할 수 있습니다.");
  }
}

async function assertStaffAvailability(input: {
  gymId: string;
  instructorStaffId: string;
  startsAt: Date;
  endsAt: Date;
  excludeGroupClassId?: string;
}) {
  const groupHits = await gymGroupClassRepository.listStaffOverlapping({
    gymId: input.gymId,
    instructorStaffId: input.instructorStaffId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    excludeId: input.excludeGroupClassId,
  });
  if (findFirstOverlap(input.startsAt, input.endsAt, groupHits)) {
    throw new AppError(
      "CONFLICT",
      "같은 선생님의 그룹수업이 이미 같은 시간에 등록되어 있습니다.",
    );
  }
  const ptHits = await gymScheduleRepository.listOverlapping({
    gymId: input.gymId,
    gymStaffId: input.instructorStaffId,
    gymMemberId: "__none__",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });
  // listOverlapping ORs staff OR member — pass impossible member and filter staff
  const staffPt = ptHits.filter((r) => r.gymStaffId === input.instructorStaffId);
  if (findFirstOverlap(input.startsAt, input.endsAt, staffPt)) {
    throw new AppError(
      "CONFLICT",
      "같은 선생님의 개인 일정이 이미 같은 시간에 등록되어 있습니다.",
    );
  }
}

async function assertMemberAvailability(input: {
  gymId: string;
  gymMemberId: string;
  startsAt: Date;
  endsAt: Date;
  excludeGroupClassId?: string;
}) {
  const groupHits = await gymGroupClassRepository.listMemberAttendingOverlapping({
    gymId: input.gymId,
    gymMemberId: input.gymMemberId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    excludeClassId: input.excludeGroupClassId,
  });
  if (groupHits.length > 0) {
    throw new AppError(
      "CONFLICT",
      "해당 회원은 같은 시간에 다른 일정이 있습니다.",
      { kind: "group_class" },
    );
  }
  const ptHits = await gymScheduleRepository.listOverlapping({
    gymId: input.gymId,
    gymStaffId: "__none__",
    gymMemberId: input.gymMemberId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });
  const memberPt = ptHits.filter((r) => r.gymMemberId === input.gymMemberId);
  if (findFirstOverlap(input.startsAt, input.endsAt, memberPt)) {
    throw new AppError(
      "CONFLICT",
      "해당 회원은 같은 시간에 다른 일정이 있습니다.",
      { kind: "personal" },
    );
  }
}

function mapClassRow(
  row: {
    id: string;
    gymId: string;
    title: string;
    description: string | null;
    instructorStaffId: string | null;
    instructorStaff: { name: string } | null;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
    location: string | null;
    status: GymGroupClassStatus;
    visibility: GymGroupClassVisibility;
    colorKey: string | null;
    participations: { status: string }[];
  },
  access: GymGroupClassAccess,
): GymGroupClassVM {
  const attendingCount = row.participations.filter((p) => p.status === "attending").length;
  const waitlistCount = row.participations.filter((p) => p.status === "waitlisted").length;
  return {
    id: row.id,
    gymId: row.gymId,
    title: row.title,
    description: row.description,
    instructorStaffId: row.instructorStaffId,
    instructorName: row.instructorStaff?.name ?? null,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    dateKey: toSeoulDateKey(row.startsAt),
    timeRangeLabel: formatSeoulScheduleRange(row.startsAt, row.endsAt),
    capacity: row.capacity,
    attendingCount,
    waitlistCount,
    location: row.location,
    status: row.status,
    statusLabel: GYM_GROUP_CLASS_STATUS_LABEL[row.status],
    visibility: row.visibility,
    visibilityLabel: GYM_GROUP_CLASS_VISIBILITY_LABEL[row.visibility],
    colorKey: row.colorKey,
    capacityExceeded:
      row.capacity != null && attendingCount > row.capacity,
    canManage: canManageGymGroupClass(access, row.instructorStaffId),
  };
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const formatted = formatPhoneNumber(phone);
  return formatted.replace(/(\d{2,3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
}

export const gymGroupClassService = {
  async listClasses(
    actor: ActorContext,
    input: {
      rangeStart: Date;
      rangeEndExclusive: Date;
      instructorStaffId?: string | null;
      status?: string | null;
      titleQuery?: string | null;
      myOnly?: boolean;
    },
  ): Promise<GymGroupClassVM[]> {
    const access = await requireGymGroupClassRead(actor);
    let instructorId = input.instructorStaffId ?? null;
    if (input.myOnly && access.gymStaffId) {
      instructorId = access.gymStaffId;
    }
    const rows = await gymGroupClassRepository.listInRange({
      gymId: access.gymId,
      rangeStart: input.rangeStart,
      rangeEndExclusive: input.rangeEndExclusive,
      instructorStaffId: instructorId,
      status: (input.status as GymGroupClassStatus | null) || null,
      titleQuery: input.titleQuery,
    });
    return rows.map((r) => mapClassRow(r, access));
  },

  async getCalendarItems(
    actor: ActorContext,
    input: {
      view: "month" | "week" | "day" | "list";
      dateKey: string;
      instructorStaffId?: string | null;
      status?: string | null;
      myOnly?: boolean;
    },
  ): Promise<GymCalendarItem[]> {
    const access = await requireGymGroupClassRead(actor);
    const at = createSeoulDateTime(input.dateKey, "12:00");
    let rangeStart: Date;
    let rangeEndExclusive: Date;
    if (input.view === "month") {
      const { year, month } = getSeoulYmdParts(at);
      const m = getSeoulScheduleMonthRange(year, month);
      rangeStart = m.start;
      rangeEndExclusive = m.endExclusive;
    } else if (input.view === "week" || input.view === "list") {
      const w = getSeoulScheduleWeekRange(at);
      rangeStart = w.start;
      rangeEndExclusive = w.endExclusive;
    } else {
      const d = getSeoulDayRange(input.dateKey);
      rangeStart = d.start;
      rangeEndExclusive = d.endExclusive;
    }
    const vms = await this.listClasses(actor, {
      rangeStart,
      rangeEndExclusive,
      instructorStaffId: input.instructorStaffId,
      status: input.status,
      myOnly: input.myOnly,
    });
    return vms.map((v) => ({
      id: v.id,
      itemType: "group_class" as const,
      title: v.title,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      dateKey: v.dateKey,
      timeRangeLabel: v.timeRangeLabel,
      staffId: v.instructorStaffId,
      staffName: v.instructorName,
      status: v.status,
      statusLabel: v.statusLabel,
      memberId: null,
      memberName: null,
      memberProfileImageUrl: null,
      groupClassId: v.id,
      participantCount: v.attendingCount,
      capacity: v.capacity,
      waitlistCount: v.waitlistCount,
      colorKey: v.colorKey,
      canManage: canManageGymGroupClass(access, v.instructorStaffId),
    }));
  },

  async getClass(actor: ActorContext, classId: string) {
    const access = await requireGymGroupClassRead(actor);
    const row = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!row) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    const vm = mapClassRow(row, access);
    const paths = row.participations
      .map((p) => p.gymMember.profileImagePath)
      .filter((p): p is string => Boolean(p));
    const urlMap = await createGymMemberImageSignedReadUrlMap(access.gymId, paths);
    const waitlisted = row.participations
      .filter((p) => p.status === "waitlisted")
      .sort(
        (a, b) =>
          (a.waitlistOrder ?? 9999) - (b.waitlistOrder ?? 9999) ||
          a.respondedAt.getTime() - b.respondedAt.getTime(),
      );
    const waitOrderMap = new Map(
      waitlisted.map((p, i) => [p.id, i + 1]),
    );
    const participants: GymGroupClassParticipantVM[] = row.participations.map(
      (p) => ({
        id: p.id,
        gymMemberId: p.gymMemberId,
        memberName: p.gymMember.name,
        memberNumber: p.gymMember.memberNumber,
        phoneMasked: maskPhone(p.gymMember.phone),
        memberStatus: p.gymMember.status,
        profileImageUrl: p.gymMember.profileImagePath
          ? urlMap.get(p.gymMember.profileImagePath) ?? null
          : null,
        status: p.status,
        statusLabel: GYM_GROUP_CLASS_PARTICIPATION_STATUS_LABEL[p.status],
        waitlistOrder: p.waitlistOrder,
        displayWaitlistOrder: waitOrderMap.get(p.id) ?? null,
        respondedAt: p.respondedAt,
        cancelledAt: p.cancelledAt,
      }),
    );
    return { class: vm, participants, canManage: vm.canManage };
  },

  async createClass(actor: ActorContext, input: GymGroupClassCreateInput) {
    const access = await requireGymGroupClassWrite(actor);
    const instructorStaffId = resolveInstructorForCreate(
      access,
      input.instructorStaffId,
    );
    await assertActiveInstructor(access.gymId, instructorStaffId);
    const { startsAt, endsAt } = parseSlotTimes(input);
    if (instructorStaffId) {
      await assertStaffAvailability({
        gymId: access.gymId,
        instructorStaffId,
        startsAt,
        endsAt,
      });
    }
    const capacity = input.capacity;
    if (capacity != null && (capacity < 1 || capacity > GYM_GROUP_CLASS_CAPACITY_MAX)) {
      throw new AppError("VALIDATION_ERROR", "정원 값이 올바르지 않습니다.");
    }

    const created = await prisma.gymGroupClass.create({
      data: {
        gymId: access.gymId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        instructorStaffId,
        startsAt,
        endsAt,
        capacity,
        location: input.location?.trim() || null,
        visibility: input.visibility ?? GymGroupClassVisibility.members_only,
        colorKey: input.colorKey?.trim() || null,
        createdByUserId: actor.userId,
      },
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_group_class_created,
      targetType: "GymGroupClass",
      targetId: created.id,
      afterData: {
        title: created.title,
        instructorStaffId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity,
      },
    });
    return { classId: created.id };
  },

  async updateClass(
    actor: ActorContext,
    classId: string,
    input: GymGroupClassUpdateInput,
  ) {
    const access = await requireGymGroupClassWrite(actor);
    const existing = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!existing) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, existing.instructorStaffId);
    if (existing.status === "cancelled") {
      throw new AppError("VALIDATION_ERROR", "취소된 수업은 수정할 수 없습니다.");
    }
    if (existing.status === "completed") {
      throw new AppError("VALIDATION_ERROR", "완료된 수업은 수정할 수 없습니다.");
    }

    let instructorStaffId = existing.instructorStaffId;
    if (access.isOwner) {
      instructorStaffId = input.instructorStaffId?.trim() || null;
    } else if (
      input.instructorStaffId &&
      input.instructorStaffId !== access.gymStaffId
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선생님은 담당자를 변경할 수 없습니다.",
      );
    }
    await assertActiveInstructor(access.gymId, instructorStaffId);
    const { startsAt, endsAt } = parseSlotTimes(input);
    if (instructorStaffId) {
      await assertStaffAvailability({
        gymId: access.gymId,
        instructorStaffId,
        startsAt,
        endsAt,
        excludeGroupClassId: classId,
      });
    }

    const attending = existing.participations.filter((p) => p.status === "attending");
    for (const p of attending) {
      await assertMemberAvailability({
        gymId: access.gymId,
        gymMemberId: p.gymMemberId,
        startsAt,
        endsAt,
        excludeGroupClassId: classId,
      });
    }

    const capacity = input.capacity;
    const capacityChanged = capacity !== existing.capacity;
    const instructorChanged = instructorStaffId !== existing.instructorStaffId;

    await prisma.$transaction(async (tx) => {
      await lockGroupClass(tx, classId);
      await tx.gymGroupClass.update({
        where: { id: classId },
        data: {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          instructorStaffId,
          startsAt,
          endsAt,
          capacity,
          location: input.location?.trim() || null,
          visibility: input.visibility ?? existing.visibility,
          colorKey: input.colorKey?.trim() || null,
          updatedByUserId: actor.userId,
        },
      });

      if (
        capacity != null &&
        (existing.capacity == null || capacity > existing.capacity)
      ) {
        await promoteWhileSpace(tx, classId, capacity, actor.userId);
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_group_class_updated,
          targetType: "GymGroupClass",
          targetId: classId,
          beforeData: {
            startsAt: existing.startsAt.toISOString(),
            endsAt: existing.endsAt.toISOString(),
            capacity: existing.capacity,
            instructorStaffId: existing.instructorStaffId,
          },
          afterData: {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            capacity,
            instructorStaffId,
          },
        },
        tx,
      );
      if (capacityChanged) {
        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: AuditAction.gym_group_class_capacity_changed,
            targetType: "GymGroupClass",
            targetId: classId,
            beforeData: { capacity: existing.capacity },
            afterData: { capacity },
          },
          tx,
        );
      }
      if (instructorChanged) {
        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: AuditAction.gym_group_class_instructor_changed,
            targetType: "GymGroupClass",
            targetId: classId,
            beforeData: { instructorStaffId: existing.instructorStaffId },
            afterData: { instructorStaffId },
          },
          tx,
        );
      }
    }, GROUP_CLASS_TX);
    return { classId };
  },

  /**
   * 보드 드래그/리사이즈용 — 기존 필드 유지하고 시간만 변경.
   */
  async rescheduleClass(
    actor: ActorContext,
    classId: string,
    slot: { dateKey: string; startHm: string; endHm: string },
  ) {
    const access = await requireGymGroupClassWrite(actor);
    const existing = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!existing) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    return this.updateClass(actor, classId, {
      title: existing.title,
      description: existing.description ?? "",
      instructorStaffId: existing.instructorStaffId ?? "",
      dateKey: slot.dateKey,
      startHm: slot.startHm,
      endHm: slot.endHm,
      capacity: existing.capacity,
      location: existing.location ?? "",
      visibility: existing.visibility,
      colorKey: existing.colorKey ?? "",
    });
  },

  async completeClass(actor: ActorContext, classId: string) {
    const access = await requireGymGroupClassWrite(actor);
    const existing = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!existing) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, existing.instructorStaffId);
    if (existing.status !== "scheduled") {
      throw new AppError("VALIDATION_ERROR", "예정 상태의 수업만 완료할 수 있습니다.");
    }
    // 출석·매출 자동 생성 금지
    await prisma.gymGroupClass.update({
      where: { id: classId },
      data: {
        status: "completed",
        completedAt: new Date(),
        completedByUserId: actor.userId,
        updatedByUserId: actor.userId,
      },
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_group_class_completed,
      targetType: "GymGroupClass",
      targetId: classId,
      afterData: { status: "completed" },
    });
    return { classId };
  },

  async cancelClass(actor: ActorContext, classId: string, reason?: string) {
    const access = await requireGymGroupClassWrite(actor);
    const existing = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!existing) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, existing.instructorStaffId);
    if (existing.status === "cancelled") {
      throw new AppError("VALIDATION_ERROR", "이미 취소된 수업입니다.");
    }
    await prisma.gymGroupClass.update({
      where: { id: classId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: actor.userId,
        cancellationReason: reason?.trim() || null,
        updatedByUserId: actor.userId,
      },
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_group_class_cancelled,
      targetType: "GymGroupClass",
      targetId: classId,
      afterData: { status: "cancelled", reason: reason?.trim() || null },
    });
    return { classId };
  },

  /**
   * Stage 3 participation SSOT — admin/owner 및 member portal이 동일 lock·capacity·promote를 사용.
   * actorUserId null = 회원 포털 자기 신청 (감사 로그 actor 없음).
   */
  async joinAsMember(input: {
    gymId: string;
    classId: string;
    gymMemberId: string;
    actorUserId: string | null;
    requireNotStarted?: boolean;
    overlapMessage?: string;
  }): Promise<{
    status: "attending" | "waitlisted";
    alreadyAttending: boolean;
  }> {
    const cls = await gymGroupClassRepository.findById(
      input.classId,
      input.gymId,
    );
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    if (cls.status !== "scheduled") {
      throw new AppError(
        "VALIDATION_ERROR",
        "예정 수업에만 참석자를 추가할 수 있습니다.",
      );
    }
    if (input.requireNotStarted && cls.startsAt.getTime() <= Date.now()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이미 시작된 수업은 변경할 수 없습니다.",
      );
    }
    const member = await prisma.gymMember.findFirst({
      where: {
        id: input.gymMemberId,
        gymId: input.gymId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    try {
      await assertMemberAvailability({
        gymId: input.gymId,
        gymMemberId: input.gymMemberId,
        startsAt: cls.startsAt,
        endsAt: cls.endsAt,
        excludeGroupClassId: input.classId,
      });
    } catch (e) {
      if (e instanceof AppError && e.code === "CONFLICT" && input.overlapMessage) {
        throw new AppError("CONFLICT", input.overlapMessage, e.details);
      }
      throw e;
    }

    return prisma.$transaction(async (tx) => {
      await lockGroupClass(tx, input.classId);
      const fresh = await tx.gymGroupClass.findFirst({
        where: {
          id: input.classId,
          gymId: input.gymId,
          deletedAt: null,
        },
      });
      if (!fresh || fresh.status !== "scheduled") {
        throw new AppError(
          "VALIDATION_ERROR",
          "예정 수업에만 참석자를 추가할 수 있습니다.",
        );
      }
      if (
        input.requireNotStarted &&
        fresh.startsAt.getTime() <= Date.now()
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "이미 시작된 수업은 변경할 수 없습니다.",
        );
      }
      const existing = await tx.gymGroupClassParticipation.findUnique({
        where: {
          gymGroupClassId_gymMemberId: {
            gymGroupClassId: input.classId,
            gymMemberId: input.gymMemberId,
          },
        },
      });
      if (existing?.status === "attending") {
        return {
          status: "attending" as const,
          alreadyAttending: true,
        };
      }
      const attendingCount = await gymGroupClassRepository.countAttending(
        tx,
        input.classId,
      );
      const hasSpace =
        fresh.capacity == null || attendingCount < fresh.capacity;
      const nextStatus: GymGroupClassParticipationStatus = hasSpace
        ? "attending"
        : "waitlisted";
      const waitlistOrder =
        nextStatus === "waitlisted"
          ? await gymGroupClassRepository.nextWaitlistOrder(tx, input.classId)
          : null;

      if (existing) {
        await tx.gymGroupClassParticipation.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            waitlistOrder,
            respondedAt: new Date(),
            cancelledAt: null,
            cancelledByUserId: null,
            createdByUserId: input.actorUserId,
          },
        });
      } else {
        await tx.gymGroupClassParticipation.create({
          data: {
            gymId: input.gymId,
            gymGroupClassId: input.classId,
            gymMemberId: input.gymMemberId,
            status: nextStatus,
            waitlistOrder,
            createdByUserId: input.actorUserId,
          },
        });
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: input.actorUserId,
          action:
            nextStatus === "attending"
              ? AuditAction.gym_group_class_participant_added
              : AuditAction.gym_group_class_participant_waitlisted,
          targetType: "GymGroupClassParticipation",
          targetId: input.classId,
          afterData: {
            gymMemberId: input.gymMemberId,
            status: nextStatus,
            waitlistOrder,
            groupClassId: input.classId,
            source: input.actorUserId ? "admin" : "member_portal",
          },
        },
        tx,
      );
      return {
        status: nextStatus,
        alreadyAttending: false,
      };
    }, GROUP_CLASS_TX);
  },

  async cancelAsMember(input: {
    gymId: string;
    classId: string;
    gymMemberId: string;
    actorUserId: string | null;
    requireNotStarted?: boolean;
  }): Promise<{ promotedMemberId: string | null }> {
    const cls = await gymGroupClassRepository.findById(
      input.classId,
      input.gymId,
    );
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    if (cls.status === "completed") {
      throw new AppError(
        "VALIDATION_ERROR",
        "완료된 수업의 참석 상태는 변경할 수 없습니다.",
      );
    }
    if (cls.status === "cancelled") {
      throw new AppError(
        "VALIDATION_ERROR",
        "취소된 수업의 참석 상태는 변경할 수 없습니다.",
      );
    }
    if (input.requireNotStarted && cls.startsAt.getTime() <= Date.now()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이미 시작된 수업은 변경할 수 없습니다.",
      );
    }

    return prisma.$transaction(async (tx) => {
      await lockGroupClass(tx, input.classId);
      const freshClass = await tx.gymGroupClass.findFirst({
        where: {
          id: input.classId,
          gymId: input.gymId,
          deletedAt: null,
        },
      });
      if (!freshClass) {
        throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
      }
      if (
        input.requireNotStarted &&
        freshClass.startsAt.getTime() <= Date.now()
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "이미 시작된 수업은 변경할 수 없습니다.",
        );
      }
      const part = await tx.gymGroupClassParticipation.findUnique({
        where: {
          gymGroupClassId_gymMemberId: {
            gymGroupClassId: input.classId,
            gymMemberId: input.gymMemberId,
          },
        },
      });
      if (
        !part ||
        part.status === "cancelled" ||
        part.status === "not_attending"
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "취소할 참석 정보가 없습니다.",
        );
      }
      const wasAttending = part.status === "attending";
      await tx.gymGroupClassParticipation.update({
        where: { id: part.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledByUserId: input.actorUserId,
          waitlistOrder: null,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: input.actorUserId,
          action: AuditAction.gym_group_class_participant_cancelled,
          targetType: "GymGroupClassParticipation",
          targetId: part.id,
          beforeData: { status: part.status },
          afterData: {
            status: "cancelled",
            gymMemberId: input.gymMemberId,
            groupClassId: input.classId,
            source: input.actorUserId ? "admin" : "member_portal",
          },
        },
        tx,
      );

      let promotedMemberId: string | null = null;
      if (wasAttending && freshClass.status === "scheduled") {
        for (let i = 0; i < 20; i++) {
          const attendingCount = await gymGroupClassRepository.countAttending(
            tx,
            input.classId,
          );
          const hasSpace =
            freshClass.capacity == null ||
            attendingCount < freshClass.capacity;
          if (!hasSpace) break;
          const next = await gymGroupClassRepository.findEarliestWaitlisted(
            tx,
            input.classId,
          );
          if (!next) break;
          try {
            await assertMemberAvailability({
              gymId: input.gymId,
              gymMemberId: next.gymMemberId,
              startsAt: freshClass.startsAt,
              endsAt: freshClass.endsAt,
              excludeGroupClassId: input.classId,
            });
          } catch {
            break;
          }
          await tx.gymGroupClassParticipation.update({
            where: { id: next.id },
            data: {
              status: "attending",
              waitlistOrder: null,
              respondedAt: new Date(),
            },
          });
          promotedMemberId = next.gymMemberId;
          await auditRepository.createAuditLog(
            {
              actorUserId: input.actorUserId,
              action: AuditAction.gym_group_class_participant_promoted,
              targetType: "GymGroupClassParticipation",
              targetId: next.id,
              afterData: {
                gymMemberId: next.gymMemberId,
                groupClassId: input.classId,
                auto: true,
                source: input.actorUserId ? "admin" : "member_portal",
              },
            },
            tx,
          );
          break;
        }
      }
      return { promotedMemberId };
    }, GROUP_CLASS_TX);
  },

  async addParticipant(actor: ActorContext, classId: string, gymMemberId: string) {
    const access = await requireGymGroupClassManageParticipants(actor);
    const cls = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, cls.instructorStaffId);

    const result = await this.joinAsMember({
      gymId: access.gymId,
      classId,
      gymMemberId,
      actorUserId: actor.userId,
    });
    return {
      status: result.status,
      promotedFromWaitlist: false,
    };
  },

  async cancelParticipant(
    actor: ActorContext,
    classId: string,
    gymMemberId: string,
  ) {
    const access = await requireGymGroupClassManageParticipants(actor);
    const cls = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, cls.instructorStaffId);

    return this.cancelAsMember({
      gymId: access.gymId,
      classId,
      gymMemberId,
      actorUserId: actor.userId,
    });
  },

  async promoteParticipant(
    actor: ActorContext,
    classId: string,
    gymMemberId: string,
  ) {
    const access = await requireGymGroupClassManageParticipants(actor);
    const cls = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, cls.instructorStaffId);
    if (cls.status !== "scheduled") {
      throw new AppError("VALIDATION_ERROR", "예정 수업에서만 승급할 수 있습니다.");
    }
    await assertMemberAvailability({
      gymId: access.gymId,
      gymMemberId,
      startsAt: cls.startsAt,
      endsAt: cls.endsAt,
      excludeGroupClassId: classId,
    });

    await prisma.$transaction(async (tx) => {
      await lockGroupClass(tx, classId);
      const fresh = await tx.gymGroupClass.findUnique({ where: { id: classId } });
      if (!fresh || fresh.status !== "scheduled") {
        throw new AppError("VALIDATION_ERROR", "예정 수업에서만 승급할 수 있습니다.");
      }
      const part = await tx.gymGroupClassParticipation.findUnique({
        where: {
          gymGroupClassId_gymMemberId: { gymGroupClassId: classId, gymMemberId },
        },
      });
      if (!part || part.status !== "waitlisted") {
        throw new AppError("VALIDATION_ERROR", "대기 중인 회원만 승급할 수 있습니다.");
      }
      const attendingCount = await gymGroupClassRepository.countAttending(tx, classId);
      if (fresh.capacity != null && attendingCount >= fresh.capacity) {
        throw new AppError("CONFLICT", "정원이 가득 차 승급할 수 없습니다.");
      }
      await tx.gymGroupClassParticipation.update({
        where: { id: part.id },
        data: { status: "attending", waitlistOrder: null, respondedAt: new Date() },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_group_class_participant_promoted,
          targetType: "GymGroupClassParticipation",
          targetId: part.id,
          afterData: { gymMemberId, groupClassId: classId, auto: false },
        },
        tx,
      );
    }, GROUP_CLASS_TX);
    return { ok: true };
  },

  async moveToWaitlist(
    actor: ActorContext,
    classId: string,
    gymMemberId: string,
  ) {
    const access = await requireGymGroupClassManageParticipants(actor);
    const cls = await gymGroupClassRepository.findById(classId, access.gymId);
    if (!cls) throw new AppError("NOT_FOUND", "그룹수업을 찾을 수 없습니다.");
    assertCanManageClass(access, cls.instructorStaffId);
    if (cls.status !== "scheduled") {
      throw new AppError("VALIDATION_ERROR", "예정 수업에서만 변경할 수 있습니다.");
    }

    await prisma.$transaction(async (tx) => {
      await lockGroupClass(tx, classId);
      const part = await tx.gymGroupClassParticipation.findUnique({
        where: {
          gymGroupClassId_gymMemberId: { gymGroupClassId: classId, gymMemberId },
        },
      });
      if (!part || part.status !== "attending") {
        throw new AppError("VALIDATION_ERROR", "참석 중인 회원만 대기로 변경할 수 있습니다.");
      }
      const order = await gymGroupClassRepository.nextWaitlistOrder(tx, classId);
      await tx.gymGroupClassParticipation.update({
        where: { id: part.id },
        data: {
          status: "waitlisted",
          waitlistOrder: order,
          respondedAt: new Date(),
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_group_class_participant_waitlisted_manual,
          targetType: "GymGroupClassParticipation",
          targetId: part.id,
          afterData: { gymMemberId, groupClassId: classId, waitlistOrder: order },
        },
        tx,
      );
      const fresh = await tx.gymGroupClass.findUnique({ where: { id: classId } });
      if (fresh) {
        await promoteWhileSpace(tx, classId, fresh.capacity, actor.userId);
      }
    }, GROUP_CLASS_TX);
    return { ok: true };
  },

  async getSummary(
    actor: ActorContext,
    opts?: { myOnly?: boolean },
  ) {
    const access = await requireGymGroupClassRead(actor);
    const now = new Date();
    const today = getSeoulDayRange(now);
    const week = getSeoulScheduleWeekRange(now);
    const instructorId =
      opts?.myOnly && access.gymStaffId ? access.gymStaffId : null;
    const todayRows = await gymGroupClassRepository.listInRange({
      gymId: access.gymId,
      rangeStart: today.start,
      rangeEndExclusive: today.endExclusive,
      instructorStaffId: instructorId,
    });
    const weekRows = await gymGroupClassRepository.listInRange({
      gymId: access.gymId,
      rangeStart: week.start,
      rangeEndExclusive: week.endExclusive,
      instructorStaffId: instructorId,
    });
    const scheduledToday = todayRows.filter((r) => r.status === "scheduled");
    const scheduledWeek = weekRows.filter((r) => r.status === "scheduled");
    const attendingToday = scheduledToday.reduce(
      (n, r) => n + r.participations.filter((p) => p.status === "attending").length,
      0,
    );
    const fullToday = scheduledToday.filter(
      (r) =>
        r.capacity != null &&
        r.participations.filter((p) => p.status === "attending").length >=
          r.capacity,
    ).length;
    const waitToday = scheduledToday.filter((r) =>
      r.participations.some((p) => p.status === "waitlisted"),
    ).length;
    const next = scheduledWeek
      .filter((r) => r.startsAt.getTime() >= now.getTime())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

    return {
      todayCount: scheduledToday.length,
      weekCount: scheduledWeek.length,
      attendingToday,
      fullToday,
      waitToday,
      next: next
        ? {
            id: next.id,
            title: next.title,
            timeRangeLabel: formatSeoulScheduleRange(next.startsAt, next.endsAt),
            dateKey: toSeoulDateKey(next.startsAt),
          }
        : null,
    };
  },

  async getMemberUpcoming(actor: ActorContext, memberId: string, days = 30) {
    const access = await requireGymGroupClassRead(actor);
    const member = await prisma.gymMember.findFirst({
      where: { id: memberId, gymId: access.gymId, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = await prisma.gymGroupClassParticipation.findMany({
      where: {
        gymMemberId: memberId,
        gymId: access.gymId,
        status: { in: ["attending", "waitlisted"] },
        gymGroupClass: {
          deletedAt: null,
          status: { not: "cancelled" },
          startsAt: { gte: now, lt: end },
        },
      },
      include: {
        gymGroupClass: {
          include: {
            instructorStaff: { select: { name: true } },
          },
        },
      },
      orderBy: { gymGroupClass: { startsAt: "asc" } },
    });
    return rows.map((r) => ({
      id: r.id,
      classId: r.gymGroupClassId,
      title: r.gymGroupClass.title,
      status: r.status,
      statusLabel: GYM_GROUP_CLASS_PARTICIPATION_STATUS_LABEL[r.status],
      dateKey: toSeoulDateKey(r.gymGroupClass.startsAt),
      timeRangeLabel: formatSeoulScheduleRange(
        r.gymGroupClass.startsAt,
        r.gymGroupClass.endsAt,
      ),
      instructorName: r.gymGroupClass.instructorStaff?.name ?? null,
    }));
  },

  async getStaffUpcoming(actor: ActorContext, staffId: string) {
    const access = await requireGymGroupClassRead(actor);
    if (!access.isOwner && access.gymStaffId !== staffId) {
      throw new PermissionError("FORBIDDEN", "다른 선생님 일정은 조회할 수 없습니다.");
    }
    const now = new Date();
    const today = getSeoulDayRange(now);
    const week = getSeoulScheduleWeekRange(now);
    const todayRows = await gymGroupClassRepository.listInRange({
      gymId: access.gymId,
      rangeStart: today.start,
      rangeEndExclusive: today.endExclusive,
      instructorStaffId: staffId,
    });
    const weekRows = await gymGroupClassRepository.listInRange({
      gymId: access.gymId,
      rangeStart: week.start,
      rangeEndExclusive: week.endExclusive,
      instructorStaffId: staffId,
    });
    const scheduledWeek = weekRows.filter((r) => r.status === "scheduled");
    const attendingTotal = scheduledWeek.reduce(
      (n, r) => n + r.participations.filter((p) => p.status === "attending").length,
      0,
    );
    const waitTotal = scheduledWeek.reduce(
      (n, r) => n + r.participations.filter((p) => p.status === "waitlisted").length,
      0,
    );
    const next = scheduledWeek
      .filter((r) => r.startsAt.getTime() >= now.getTime())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
    return {
      todayCount: todayRows.filter((r) => r.status === "scheduled").length,
      weekCount: scheduledWeek.length,
      attendingTotal,
      waitTotal,
      next: next
        ? {
            id: next.id,
            title: next.title,
            timeRangeLabel: formatSeoulScheduleRange(next.startsAt, next.endsAt),
          }
        : null,
    };
  },
};

async function promoteWhileSpace(
  tx: Prisma.TransactionClient,
  classId: string,
  capacity: number | null,
  actorUserId: string,
) {
  for (;;) {
    const attendingCount = await gymGroupClassRepository.countAttending(tx, classId);
    if (capacity != null && attendingCount >= capacity) break;
    const next = await gymGroupClassRepository.findEarliestWaitlisted(tx, classId);
    if (!next) break;
    const cls = await tx.gymGroupClass.findUnique({ where: { id: classId } });
    if (!cls) break;
    try {
      await assertMemberAvailability({
        gymId: cls.gymId,
        gymMemberId: next.gymMemberId,
        startsAt: cls.startsAt,
        endsAt: cls.endsAt,
        excludeGroupClassId: classId,
      });
    } catch {
      break;
    }
    await tx.gymGroupClassParticipation.update({
      where: { id: next.id },
      data: { status: "attending", waitlistOrder: null, respondedAt: new Date() },
    });
    await auditRepository.createAuditLog(
      {
        actorUserId,
        action: AuditAction.gym_group_class_participant_promoted,
        targetType: "GymGroupClassParticipation",
        targetId: next.id,
        afterData: {
          gymMemberId: next.gymMemberId,
          groupClassId: classId,
          auto: true,
          reason: "capacity_increase",
        },
      },
      tx,
    );
  }
}

// silence unused import if tree-shaken
void getSeoulYmdParts;
