/**
 * 개인 PT 일정 SSOT.
 * - UTC 저장 / Asia/Seoul 표시
 * - 10분 슬롯, 당일만, staff·member overlap
 * - 완료/노쇼 시 출석·매출 자동 생성 금지
 */
import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  AuditAction,
  GymPersonalScheduleStatus,
  GymPersonalScheduleType,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  canManageGymScheduleRow,
  requireGymScheduleRead,
  requireGymScheduleWrite,
  type GymScheduleAccess,
} from "@/lib/gym-schedule/access";
import { findFirstOverlap } from "@/lib/gym-schedule/overlap";
import {
  GYM_PERSONAL_SCHEDULE_STATUS_LABEL,
  GYM_PERSONAL_SCHEDULE_TYPE_LABEL,
} from "@/lib/gym-schedule/labels";
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
import {
  gymScheduleRepository,
  type GymScheduleRow,
} from "@/lib/repositories/gym-schedule.repository";
import { createGymMemberImageSignedReadUrlMap } from "@/lib/services/gym-member-image.service";
import type {
  GymScheduleCreateInput,
  GymScheduleUpdateInput,
} from "@/lib/validators/gym-schedule.validator";
import { formatPhoneNumber } from "@/lib/phone";

export type GymScheduleVM = {
  id: string;
  gymId: string;
  gymStaffId: string;
  gymMemberId: string;
  title: string;
  scheduleType: GymPersonalScheduleType;
  scheduleTypeLabel: string;
  startsAt: Date;
  endsAt: Date;
  timeRangeLabel: string;
  dateKey: string;
  status: GymPersonalScheduleStatus;
  statusLabel: string;
  location: string | null;
  memo: string | null;
  colorKey: string | null;
  staffName: string;
  staffTitle: string | null;
  staffColorKey: string | null;
  memberName: string;
  memberNumber: string;
  memberPhoneMasked: string;
  memberProfileImageUrl: string | null;
  memberStatus: string;
  canManage: boolean;
};

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return formatPhoneNumber(phone);
  return `***-****-${digits.slice(-4)}`;
}

function toVm(
  row: GymScheduleRow,
  access: GymScheduleAccess,
  imageUrlByPath: Map<string, string>,
): GymScheduleVM {
  return {
    id: row.id,
    gymId: row.gymId,
    gymStaffId: row.gymStaffId,
    gymMemberId: row.gymMemberId,
    title: row.title,
    scheduleType: row.scheduleType,
    scheduleTypeLabel: GYM_PERSONAL_SCHEDULE_TYPE_LABEL[row.scheduleType],
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timeRangeLabel: formatSeoulScheduleRange(row.startsAt, row.endsAt),
    dateKey: toSeoulDateKey(row.startsAt),
    status: row.status,
    statusLabel: GYM_PERSONAL_SCHEDULE_STATUS_LABEL[row.status],
    location: row.location,
    memo: row.memo,
    colorKey: row.colorKey ?? row.gymStaff.colorKey,
    staffName: row.gymStaff.name,
    staffTitle: row.gymStaff.title,
    staffColorKey: row.gymStaff.colorKey,
    memberName: row.gymMember.name,
    memberNumber: row.gymMember.memberNumber,
    memberPhoneMasked: maskPhone(row.gymMember.phone),
    memberProfileImageUrl: row.gymMember.profileImagePath
      ? (imageUrlByPath.get(row.gymMember.profileImagePath) ?? null)
      : null,
    memberStatus: row.gymMember.status,
    canManage: canManageGymScheduleRow(access, row.gymStaffId),
  };
}

async function mapRows(
  rows: GymScheduleRow[],
  access: GymScheduleAccess,
): Promise<GymScheduleVM[]> {
  const imageUrlByPath = await createGymMemberImageSignedReadUrlMap(
    access.gymId,
    rows.map((r) => r.gymMember.profileImagePath),
  );
  return rows.map((r) => toVm(r, access, imageUrlByPath));
}

function resolveStatusFilter(
  status: string | null | undefined,
): GymPersonalScheduleStatus[] | null {
  if (!status || status === "all") return null;
  if (status === "active") {
    return ["scheduled", "completed", "no_show"];
  }
  if (
    status === "scheduled" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "no_show"
  ) {
    return [status];
  }
  return ["scheduled", "completed", "no_show"];
}

function parseSlotTimes(input: {
  dateKey: string;
  startHm: string;
  endHm: string;
}): { startsAt: Date; endsAt: Date } {
  let startsAt: Date;
  let endsAt: Date;
  try {
    startsAt = createSeoulDateTime(input.dateKey, input.startHm);
    endsAt = createSeoulDateTime(input.dateKey, input.endHm);
  } catch {
    throw new AppError("VALIDATION_ERROR", "날짜·시각 형식이 올바르지 않습니다.");
  }
  try {
    assertTenMinuteInstant(startsAt, "시작 시각");
    assertTenMinuteInstant(endsAt, "종료 시각");
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "시작·종료 시각은 10분 단위로만 설정할 수 있습니다.",
    );
  }
  if (!isSameSeoulCalendarDay(startsAt, endsAt)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "날짜를 넘기는 일정은 등록할 수 없습니다.",
    );
  }
  const duration = endsAt.getTime() - startsAt.getTime();
  if (duration < SCHEDULE_MIN_DURATION_MS) {
    throw new AppError("VALIDATION_ERROR", "일정은 최소 10분 이상이어야 합니다.");
  }
  if (duration > SCHEDULE_MAX_DURATION_MS) {
    throw new AppError("VALIDATION_ERROR", "일정은 최대 8시간까지 가능합니다.");
  }
  return { startsAt, endsAt };
}

async function assertStaffAndMemberInGym(
  gymId: string,
  gymStaffId: string,
  gymMemberId: string,
) {
  const [staff, member] = await Promise.all([
    prisma.gymStaff.findFirst({
      where: { id: gymStaffId, gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.gymMember.findFirst({
      where: { id: gymMemberId, gymId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
  ]);
  if (!staff) {
    throw new AppError("NOT_FOUND", "선생님을 찾을 수 없습니다.");
  }
  if (!member) {
    throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
  }
  return { staff, member };
}

async function assertNoOverlap(input: {
  gymId: string;
  gymStaffId: string;
  gymMemberId: string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
}) {
  const rows = await gymScheduleRepository.listOverlapping(input);
  const staffHit = findFirstOverlap(
    input.startsAt,
    input.endsAt,
    rows.filter((r) => r.gymStaffId === input.gymStaffId),
  );
  if (staffHit) {
    throw new AppError(
      "CONFLICT",
      "같은 선생님의 일정이 이미 같은 시간에 등록되어 있습니다.",
      { kind: "staff", conflictId: staffHit.id },
    );
  }
  const memberHit = findFirstOverlap(
    input.startsAt,
    input.endsAt,
    rows.filter((r) => r.gymMemberId === input.gymMemberId),
  );
  if (memberHit) {
    throw new AppError(
      "CONFLICT",
      "같은 회원의 일정이 이미 같은 시간에 등록되어 있습니다.",
      { kind: "member", conflictId: memberHit.id },
    );
  }
}

/**
 * 동시 생성/수정 race 방지 — staff·member 키별 transaction advisory lock.
 * Postgres exclusion constraint 도입 전 Stage 2 보완.
 */
async function lockScheduleActors(
  tx: { $executeRaw: typeof prisma.$executeRaw },
  gymStaffId: string,
  gymMemberId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gps-staff:${gymStaffId}`}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gps-member:${gymMemberId}`}))`;
}

function defaultTitle(memberName: string, type: GymPersonalScheduleType): string {
  return `${memberName} ${GYM_PERSONAL_SCHEDULE_TYPE_LABEL[type]}`;
}

function assertStaffWriteScope(
  access: GymScheduleAccess,
  gymStaffId: string,
) {
  if (!canManageGymScheduleRow(access, gymStaffId)) {
    throw new PermissionError(
      "FORBIDDEN",
      "다른 선생님의 일정은 수정할 수 없습니다.",
    );
  }
}

export const gymScheduleService = {
  async listSchedules(
    actor: ActorContext,
    input: {
      rangeStart: Date;
      rangeEndExclusive: Date;
      gymStaffId?: string | null;
      gymMemberId?: string | null;
      status?: string | null;
      myOnly?: boolean;
    },
  ): Promise<GymScheduleVM[]> {
    const access = await requireGymScheduleRead(actor);
    let staffId = input.gymStaffId ?? null;
    if (!access.isOwner || input.myOnly) {
      if (!access.gymStaffId) {
        return [];
      }
      staffId = access.gymStaffId;
    }
    const rows = await gymScheduleRepository.listInRange({
      gymId: access.gymId,
      rangeStart: input.rangeStart,
      rangeEndExclusive: input.rangeEndExclusive,
      gymStaffId: staffId,
      gymMemberId: input.gymMemberId ?? null,
      statuses: resolveStatusFilter(input.status),
    });
    return mapRows(rows, access);
  },

  async getSchedule(
    actor: ActorContext,
    scheduleId: string,
  ): Promise<GymScheduleVM> {
    const access = await requireGymScheduleRead(actor);
    const row = await gymScheduleRepository.findById(scheduleId, access.gymId);
    if (!row) throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    if (!access.isOwner && row.gymStaffId !== access.gymStaffId) {
      throw new PermissionError("FORBIDDEN", "일정을 조회할 수 없습니다.");
    }
    const [vm] = await mapRows([row], access);
    return vm!;
  },

  async getCalendar(
    actor: ActorContext,
    input: {
      view: "month" | "week" | "day" | "list";
      dateKey: string;
      gymStaffId?: string | null;
      gymMemberId?: string | null;
      status?: string | null;
      myOnly?: boolean;
      itemKind?: "all" | "personal" | "group_class";
    },
  ) {
    const access = await requireGymScheduleRead(actor);
    const anchor = createSeoulDateTime(input.dateKey, "12:00");
    let rangeStart: Date;
    let rangeEndExclusive: Date;
    if (input.view === "month") {
      const { year, month } = getSeoulYmdParts(anchor);
      ({ start: rangeStart, endExclusive: rangeEndExclusive } =
        getSeoulScheduleMonthRange(year, month));
    } else if (input.view === "week" || input.view === "list") {
      ({ start: rangeStart, endExclusive: rangeEndExclusive } =
        getSeoulScheduleWeekRange(anchor));
    } else {
      ({ start: rangeStart, endExclusive: rangeEndExclusive } = getSeoulDayRange(
        input.dateKey,
      ));
    }

    const kind = input.itemKind ?? "all";
    const personalVms =
      kind === "group_class"
        ? []
        : await this.listSchedules(actor, {
            rangeStart,
            rangeEndExclusive,
            gymStaffId: input.gymStaffId,
            gymMemberId: input.gymMemberId,
            status: input.status,
            myOnly: input.myOnly,
          });

    const personalItems: import("@/lib/gym-schedule/calendar-item").GymCalendarItem[] =
      personalVms.map((v) => ({
        id: v.id,
        itemType: "personal" as const,
        title: v.title,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        dateKey: v.dateKey,
        timeRangeLabel: v.timeRangeLabel,
        staffId: v.gymStaffId,
        staffName: v.staffName,
        status: v.status,
        statusLabel: v.statusLabel,
        memberId: v.gymMemberId,
        memberName: v.memberName,
        memberProfileImageUrl: v.memberProfileImageUrl,
        groupClassId: null,
        participantCount: null,
        capacity: null,
        waitlistCount: null,
        colorKey: v.colorKey,
        scheduleType: v.scheduleType,
        scheduleTypeLabel: v.scheduleTypeLabel,
        memo: v.memo,
        location: v.location,
        canManage: v.canManage,
      }));

    let groupItems: import("@/lib/gym-schedule/calendar-item").GymCalendarItem[] =
      [];
    if (kind !== "personal") {
      const { gymGroupClassService } = await import(
        "@/lib/services/gym-group-class.service"
      );
      groupItems = await gymGroupClassService.getCalendarItems(actor, {
        view: input.view,
        dateKey: input.dateKey,
        instructorStaffId: input.myOnly ? access.gymStaffId : input.gymStaffId,
        status:
          input.status === "active" || !input.status
            ? "scheduled"
            : input.status === "all"
              ? null
              : input.status,
        myOnly: input.myOnly,
      });
    }

    const items = [...personalItems, ...groupItems].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );
    return { rangeStart, rangeEndExclusive, items };
  },

  async getSummary(
    actor: ActorContext,
    opts?: { myOnly?: boolean },
  ): Promise<{
    todayScheduled: number;
    todayCompleted: number;
    todayNoShow: number;
    weekScheduled: number;
    weekNoShow: number;
    weekCancelled: number;
    next: GymScheduleVM | null;
  }> {
    const access = await requireGymScheduleRead(actor);
    const staffId =
      !access.isOwner || opts?.myOnly ? access.gymStaffId : null;
    const today = getSeoulDayRange(new Date());
    const week = getSeoulScheduleWeekRange(new Date());
    const [todayCounts, weekCounts, upcoming] = await Promise.all([
      gymScheduleRepository.countByStatus({
        gymId: access.gymId,
        rangeStart: today.start,
        rangeEndExclusive: today.endExclusive,
        gymStaffId: staffId,
      }),
      gymScheduleRepository.countByStatus({
        gymId: access.gymId,
        rangeStart: week.start,
        rangeEndExclusive: week.endExclusive,
        gymStaffId: staffId,
      }),
      gymScheduleRepository.listInRange({
        gymId: access.gymId,
        rangeStart: new Date(),
        rangeEndExclusive: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        gymStaffId: staffId,
        statuses: ["scheduled"],
      }),
    ]);
    const nextRows = upcoming.slice(0, 1);
    const nextVms = await mapRows(nextRows, access);
    return {
      todayScheduled: todayCounts.scheduled,
      todayCompleted: todayCounts.completed,
      todayNoShow: todayCounts.no_show,
      weekScheduled: weekCounts.scheduled,
      weekNoShow: weekCounts.no_show,
      weekCancelled: weekCounts.cancelled,
      next: nextVms[0] ?? null,
    };
  },

  async getMemberUpcoming(
    actor: ActorContext,
    memberId: string,
    days = 30,
  ): Promise<GymScheduleVM[]> {
    const access = await requireGymScheduleRead(actor);
    const member = await prisma.gymMember.findFirst({
      where: { id: memberId, gymId: access.gymId, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = await gymScheduleRepository.listInRange({
      gymId: access.gymId,
      rangeStart: now,
      rangeEndExclusive: end,
      gymMemberId: memberId,
      gymStaffId: access.isOwner ? null : access.gymStaffId,
      statuses: ["scheduled"],
    });
    return mapRows(rows, access);
  },

  async getStaffUpcoming(
    actor: ActorContext,
    staffId: string,
  ): Promise<{
    today: GymScheduleVM[];
    week: GymScheduleVM[];
    next: GymScheduleVM | null;
    scheduledCount: number;
  }> {
    const access = await requireGymScheduleRead(actor);
    if (!access.isOwner && access.gymStaffId !== staffId) {
      throw new PermissionError("FORBIDDEN", "일정을 조회할 수 없습니다.");
    }
    const today = getSeoulDayRange(new Date());
    const week = getSeoulScheduleWeekRange(new Date());
    const [todayRows, weekRows, nextRows] = await Promise.all([
      gymScheduleRepository.listInRange({
        gymId: access.gymId,
        rangeStart: today.start,
        rangeEndExclusive: today.endExclusive,
        gymStaffId: staffId,
        statuses: ["scheduled", "completed", "no_show"],
      }),
      gymScheduleRepository.listInRange({
        gymId: access.gymId,
        rangeStart: week.start,
        rangeEndExclusive: week.endExclusive,
        gymStaffId: staffId,
        statuses: ["scheduled"],
      }),
      gymScheduleRepository.listInRange({
        gymId: access.gymId,
        rangeStart: new Date(),
        rangeEndExclusive: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        gymStaffId: staffId,
        statuses: ["scheduled"],
      }),
    ]);
    const [todayVms, weekVms, nextVms] = await Promise.all([
      mapRows(todayRows, access),
      mapRows(weekRows, access),
      mapRows(nextRows.slice(0, 1), access),
    ]);
    return {
      today: todayVms,
      week: weekVms,
      next: nextVms[0] ?? null,
      scheduledCount: weekRows.length,
    };
  },

  async createSchedule(
    actor: ActorContext,
    input: GymScheduleCreateInput,
  ): Promise<{ scheduleId: string; notAssignedHint: boolean }> {
    const access = await requireGymScheduleWrite(actor);
    assertStaffWriteScope(access, input.gymStaffId);

    const { startsAt, endsAt } = parseSlotTimes(input);
    if (!access.isOwner && startsAt.getTime() < Date.now()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선생님은 현재 시각 이후 일정만 등록할 수 있습니다.",
      );
    }

    const { member } = await assertStaffAndMemberInGym(
      access.gymId,
      input.gymStaffId,
      input.gymMemberId,
    );

    const scheduleType =
      input.scheduleType ?? GymPersonalScheduleType.personal_training;
    const title =
      input.title?.trim() || defaultTitle(member.name, scheduleType);

    const scheduleId = await prisma.$transaction(async (tx) => {
      await lockScheduleActors(tx, input.gymStaffId, input.gymMemberId);
      await assertNoOverlap({
        gymId: access.gymId,
        gymStaffId: input.gymStaffId,
        gymMemberId: input.gymMemberId,
        startsAt,
        endsAt,
      });
      // re-check inside tx via raw-ish find
      const conflicts = await tx.gymPersonalSchedule.findMany({
        where: {
          gymId: access.gymId,
          deletedAt: null,
          status: { not: "cancelled" },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          OR: [
            { gymStaffId: input.gymStaffId },
            { gymMemberId: input.gymMemberId },
          ],
        },
        select: {
          id: true,
          gymStaffId: true,
          gymMemberId: true,
          startsAt: true,
          endsAt: true,
        },
      });
      if (
        findFirstOverlap(
          startsAt,
          endsAt,
          conflicts.filter((c) => c.gymStaffId === input.gymStaffId),
        )
      ) {
        throw new AppError(
          "CONFLICT",
          "같은 선생님의 일정이 이미 같은 시간에 등록되어 있습니다.",
        );
      }
      if (
        findFirstOverlap(
          startsAt,
          endsAt,
          conflicts.filter((c) => c.gymMemberId === input.gymMemberId),
        )
      ) {
        throw new AppError(
          "CONFLICT",
          "같은 회원의 일정이 이미 같은 시간에 등록되어 있습니다.",
        );
      }

      const created = await tx.gymPersonalSchedule.create({
        data: {
          gymId: access.gymId,
          gymStaffId: input.gymStaffId,
          gymMemberId: input.gymMemberId,
          title,
          scheduleType,
          startsAt,
          endsAt,
          status: "scheduled",
          location: input.location?.trim() || null,
          memo: input.memo?.trim() || null,
          colorKey: input.colorKey?.trim() || null,
          createdByUserId: actor.userId,
        },
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_personal_schedule_created,
          targetType: "GymPersonalSchedule",
          targetId: created.id,
          afterData: {
            scheduleId: created.id,
            gymStaffId: created.gymStaffId,
            gymMemberId: created.gymMemberId,
            startsAt: created.startsAt.toISOString(),
            endsAt: created.endsAt.toISOString(),
            scheduleType: created.scheduleType,
            status: created.status,
          },
        },
        tx,
      );
      return created.id;
    });

    const assignment = await prisma.gymStaffMemberAssignment.findFirst({
      where: {
        gymId: access.gymId,
        gymStaffId: input.gymStaffId,
        gymMemberId: input.gymMemberId,
        deletedAt: null,
        endedAt: null,
      },
      select: { id: true },
    });

    return { scheduleId, notAssignedHint: !assignment };
  },

  async updateSchedule(
    actor: ActorContext,
    scheduleId: string,
    input: GymScheduleUpdateInput,
  ): Promise<{ scheduleId: string }> {
    const access = await requireGymScheduleWrite(actor);
    const existing = await gymScheduleRepository.findById(
      scheduleId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    assertStaffWriteScope(access, existing.gymStaffId);

    if (existing.status === "cancelled") {
      throw new AppError("VALIDATION_ERROR", "취소된 일정은 수정할 수 없습니다.");
    }
    if (existing.status === "completed" || existing.status === "no_show") {
      if (!access.isOwner) {
        throw new AppError(
          "VALIDATION_ERROR",
          "완료·노쇼 일정은 관장만 보정할 수 있습니다.",
        );
      }
    }

    assertStaffWriteScope(access, input.gymStaffId);
    const { startsAt, endsAt } = parseSlotTimes(input);
    if (!access.isOwner && startsAt.getTime() < Date.now() && existing.status === "scheduled") {
      // staff may keep past scheduled only if not moving earlier than now on create-like edit
      // allow edit of own scheduled if already in past (status change elsewhere)
    }

    const { member } = await assertStaffAndMemberInGym(
      access.gymId,
      input.gymStaffId,
      input.gymMemberId,
    );
    const scheduleType = input.scheduleType;
    const title =
      input.title?.trim() || defaultTitle(member.name, scheduleType);

    await prisma.$transaction(async (tx) => {
      await lockScheduleActors(tx, input.gymStaffId, input.gymMemberId);
      const conflicts = await tx.gymPersonalSchedule.findMany({
        where: {
          gymId: access.gymId,
          deletedAt: null,
          status: { not: "cancelled" },
          id: { not: scheduleId },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          OR: [
            { gymStaffId: input.gymStaffId },
            { gymMemberId: input.gymMemberId },
          ],
        },
        select: {
          id: true,
          gymStaffId: true,
          gymMemberId: true,
          startsAt: true,
          endsAt: true,
        },
      });
      if (
        findFirstOverlap(
          startsAt,
          endsAt,
          conflicts.filter((c) => c.gymStaffId === input.gymStaffId),
        )
      ) {
        throw new AppError(
          "CONFLICT",
          "같은 선생님의 일정이 이미 같은 시간에 등록되어 있습니다.",
        );
      }
      if (
        findFirstOverlap(
          startsAt,
          endsAt,
          conflicts.filter((c) => c.gymMemberId === input.gymMemberId),
        )
      ) {
        throw new AppError(
          "CONFLICT",
          "같은 회원의 일정이 이미 같은 시간에 등록되어 있습니다.",
        );
      }

      await tx.gymPersonalSchedule.update({
        where: { id: scheduleId },
        data: {
          gymStaffId: input.gymStaffId,
          gymMemberId: input.gymMemberId,
          title,
          scheduleType,
          startsAt,
          endsAt,
          location: input.location?.trim() || null,
          memo: input.memo?.trim() || null,
          colorKey: input.colorKey?.trim() || null,
          updatedByUserId: actor.userId,
        },
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_personal_schedule_updated,
          targetType: "GymPersonalSchedule",
          targetId: scheduleId,
          beforeData: {
            startsAt: existing.startsAt.toISOString(),
            endsAt: existing.endsAt.toISOString(),
            gymStaffId: existing.gymStaffId,
            gymMemberId: existing.gymMemberId,
            status: existing.status,
          },
          afterData: {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            gymStaffId: input.gymStaffId,
            gymMemberId: input.gymMemberId,
            status: existing.status,
          },
        },
        tx,
      );
    });

    return { scheduleId };
  },

  /**
   * 보드 드래그/리사이즈용 — 기존 필드 유지하고 시간만 변경.
   * overlap·권한 검증은 updateSchedule SSOT를 그대로 탄다.
   */
  async rescheduleSchedule(
    actor: ActorContext,
    scheduleId: string,
    slot: { dateKey: string; startHm: string; endHm: string },
  ): Promise<{ scheduleId: string }> {
    const access = await requireGymScheduleWrite(actor);
    const existing = await gymScheduleRepository.findById(
      scheduleId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    return this.updateSchedule(actor, scheduleId, {
      gymStaffId: existing.gymStaffId,
      gymMemberId: existing.gymMemberId,
      dateKey: slot.dateKey,
      startHm: slot.startHm,
      endHm: slot.endHm,
      scheduleType: existing.scheduleType,
      title: existing.title,
      location: existing.location ?? "",
      memo: existing.memo ?? "",
      colorKey: existing.colorKey ?? "",
    });
  },

  async completeSchedule(actor: ActorContext, scheduleId: string) {
    return this.setTerminalStatus(actor, scheduleId, "completed");
  },

  async markNoShow(actor: ActorContext, scheduleId: string) {
    return this.setTerminalStatus(actor, scheduleId, "no_show");
  },

  async setTerminalStatus(
    actor: ActorContext,
    scheduleId: string,
    status: "completed" | "no_show",
  ) {
    const access = await requireGymScheduleWrite(actor);
    const existing = await gymScheduleRepository.findById(
      scheduleId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    assertStaffWriteScope(access, existing.gymStaffId);
    if (existing.status !== "scheduled") {
      throw new AppError(
        "VALIDATION_ERROR",
        "예정 상태의 일정만 처리할 수 있습니다.",
      );
    }

    const action =
      status === "completed"
        ? AuditAction.gym_personal_schedule_completed
        : AuditAction.gym_personal_schedule_no_show;

    await prisma.$transaction(async (tx) => {
      await tx.gymPersonalSchedule.update({
        where: { id: scheduleId },
        data: {
          status,
          completedAt: new Date(),
          completedByUserId: actor.userId,
          updatedByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action,
          targetType: "GymPersonalSchedule",
          targetId: scheduleId,
          beforeData: { status: existing.status },
          afterData: {
            status,
            gymStaffId: existing.gymStaffId,
            gymMemberId: existing.gymMemberId,
          },
        },
        tx,
      );
    });
    return { scheduleId, status };
  },

  async cancelSchedule(
    actor: ActorContext,
    scheduleId: string,
    reason?: string,
  ) {
    const access = await requireGymScheduleWrite(actor);
    const existing = await gymScheduleRepository.findById(
      scheduleId,
      access.gymId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    assertStaffWriteScope(access, existing.gymStaffId);
    if (existing.status === "cancelled") {
      throw new AppError("VALIDATION_ERROR", "이미 취소된 일정입니다.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.gymPersonalSchedule.update({
        where: { id: scheduleId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledByUserId: actor.userId,
          cancellationReason: reason?.trim() || null,
          updatedByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_personal_schedule_cancelled,
          targetType: "GymPersonalSchedule",
          targetId: scheduleId,
          beforeData: { status: existing.status },
          afterData: {
            status: "cancelled",
            gymStaffId: existing.gymStaffId,
            gymMemberId: existing.gymMemberId,
            hasReason: Boolean(reason?.trim()),
          },
        },
        tx,
      );
    });
    return { scheduleId };
  },

  /** verify / internal — 순수 overlap 재검증 */
  assertNoGymScheduleOverlap: assertNoOverlap,
};
