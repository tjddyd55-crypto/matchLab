import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction } from "@/lib/enums";
import {
  groupSchedulesByDateKey,
  parseAssociationScheduleDateTime,
  type AssociationScheduleCalendarItem,
} from "@/lib/association-schedule/calendar";
import {
  buildEventSchedulePrefill,
  type EventSchedulePrefill,
} from "@/lib/association-schedule/event-prefill";
import {
  requireAssociationScheduleOrganizerScope,
  resolveIntakeFormOwnerScopeForOrganizer,
} from "@/lib/intake-form/access";
import { toSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { associationScheduleRepository } from "@/lib/repositories/association-schedule.repository";
import { intakeFormRepository } from "@/lib/repositories/intake-form.repository";
import {
  createSeoulDateTime,
  getSeoulScheduleMonthRange,
  getSeoulScheduleWeekRange,
} from "@/lib/gym-schedule/seoul-schedule";
import {
  buildSeoulMonthCalendarCells,
  listSeoulWeekDateKeys,
  seoulDateKeyParts,
} from "@/lib/gym-member-portal/class-calendar";
import { parseSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import type { AssociationScheduleUpsertInput } from "@/lib/validators/association-schedule.validator";

function resolveScheduleStart(input: AssociationScheduleUpsertInput) {
  const hasExplicitTime = Boolean(input.startsAtHm?.trim());
  const treatAsAllDay = Boolean(input.allDay) || !hasExplicitTime;
  const startsAt = parseAssociationScheduleDateTime(
    input.startsAtDate,
    input.startsAtHm,
    treatAsAllDay,
  );
  if (!startsAt) {
    throw new AppError("VALIDATION_ERROR", "시작일·시간이 올바르지 않습니다.");
  }
  return { startsAt, allDay: treatAsAllDay };
}

async function validateScheduleRelations(
  organizerId: string,
  relatedFormId?: string | null,
  relatedNoticeId?: string | null,
  relatedEventId?: string | null,
) {
  if (relatedFormId) {
    const form = await prisma.intakeForm.findFirst({
      where: {
        id: relatedFormId,
        deletedAt: null,
        ownerType: "organizer",
        organizerId,
      },
    });
    if (!form) {
      throw new AppError("VALIDATION_ERROR", "연결할 신청 폼을 찾을 수 없습니다.");
    }
  }
  if (relatedNoticeId) {
    const notice = await prisma.associationNotice.findFirst({
      where: { id: relatedNoticeId, organizerId, deletedAt: null },
    });
    if (!notice) {
      throw new AppError("VALIDATION_ERROR", "연결할 공지를 찾을 수 없습니다.");
    }
  }
  if (relatedEventId) {
    const event = await prisma.event.findFirst({
      where: { id: relatedEventId, organizerId },
      select: { id: true },
    });
    if (!event) {
      throw new AppError("VALIDATION_ERROR", "연결할 대회를 찾을 수 없습니다.");
    }
  }
}

async function assertNoDuplicateEventSchedule(
  organizerId: string,
  relatedEventId: string,
  excludeScheduleId?: string,
) {
  const existing = await associationScheduleRepository.findActiveByRelatedEventId(
    organizerId,
    relatedEventId,
  );
  if (existing && existing.id !== excludeScheduleId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "이미 협회 일정에 등록된 대회입니다.",
    );
  }
}

function mapCalendarItem(
  r: Awaited<ReturnType<typeof associationScheduleRepository.listInRange>>[number],
): AssociationScheduleCalendarItem {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    allDay: r.allDay,
    location: r.location,
    visibility: r.visibility,
    relatedForm: r.relatedForm,
    relatedNotice: r.relatedNotice,
    relatedEvent: r.relatedEvent,
    relatedUrl: r.relatedUrl,
  };
}

export const associationScheduleService = {
  async getMonthCalendar(
    actor: ActorContext,
    input: { month?: string; anchorDateKey?: string },
  ) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const anchor =
      input.anchorDateKey && parseSeoulDateOnlyString(input.anchorDateKey)
        ? input.anchorDateKey
        : undefined;
    let year: number;
    let month: number;
    if (input.month && /^\d{4}-\d{2}$/.test(input.month)) {
      const [y, m] = input.month.split("-").map(Number);
      year = y;
      month = m;
    } else if (anchor) {
      const parts = seoulDateKeyParts(anchor);
      year = parts.year;
      month = parts.month;
    } else {
      const todayKey = toSeoulDateOnlyString(new Date());
      const parts = seoulDateKeyParts(todayKey);
      year = parts.year;
      month = parts.month;
    }
    const monthKey = `${year}-${String(month).padStart(2, "0")}-01`;
    const { start: rangeStart, endExclusive } = getSeoulScheduleMonthRange(
      year,
      month,
    );
    const rangeEnd = new Date(endExclusive.getTime() - 1);
    const cells = buildSeoulMonthCalendarCells(year, month);
    const dateKeys = cells.map((c) => c.dateKey);
    const rows = await associationScheduleRepository.listInRange(
      organizerId,
      rangeStart,
      rangeEnd,
    );
    const items = rows.map(mapCalendarItem);
    const byDate = groupSchedulesByDateKey(items, dateKeys);
    return {
      year,
      month,
      cells,
      schedulesByDate: byDate,
      monthLabel: `${year}년 ${month}월`,
    };
  },

  async getWeekCalendar(
    actor: ActorContext,
    input: { dateKey?: string },
  ) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const anchor =
      input.dateKey && parseSeoulDateOnlyString(input.dateKey)
        ? input.dateKey
        : toSeoulDateOnlyString(new Date());
    const anchorDate = createSeoulDateTime(anchor, "12:00");
    const { start: rangeStart, endExclusive } =
      getSeoulScheduleWeekRange(anchorDate);
    const rangeEnd = new Date(endExclusive.getTime() - 1);
    const dateKeys = listSeoulWeekDateKeys(anchor);
    const rows = await associationScheduleRepository.listInRange(
      organizerId,
      rangeStart,
      rangeEnd,
    );
    const items = rows.map(mapCalendarItem);
    const byDate = groupSchedulesByDateKey(items, dateKeys);
    return { anchorDateKey: anchor, dateKeys, schedulesByDate: byDate };
  },

  async getDetail(actor: ActorContext, scheduleId: string) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const row = await associationScheduleRepository.findByIdForOrganizer(
      organizerId,
      scheduleId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    }
    return row;
  },

  async mapEventScheduleLinks(actor: ActorContext, eventIds: string[]) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    return associationScheduleRepository.mapActiveRelatedEventIds(
      organizerId,
      eventIds,
    );
  },

  async getEventScheduleLink(actor: ActorContext, eventId: string) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const row = await associationScheduleRepository.findActiveByRelatedEventId(
      organizerId,
      eventId,
    );
    return row
      ? {
          scheduleId: row.id,
          dateKey: toSeoulDateOnlyString(row.startsAt),
        }
      : null;
  },

  async getEventSchedulePrefill(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventSchedulePrefill> {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId },
      select: {
        id: true,
        title: true,
        eventDate: true,
        location: true,
        locationName: true,
      },
    });
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    await assertNoDuplicateEventSchedule(organizerId, eventId);
    return buildEventSchedulePrefill(event);
  },

  async create(actor: ActorContext, input: AssociationScheduleUpsertInput) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const { startsAt, allDay } = resolveScheduleStart(input);
    await validateScheduleRelations(
      organizerId,
      input.relatedFormId,
      input.relatedNoticeId,
      input.relatedEventId,
    );
    if (input.relatedEventId) {
      await assertNoDuplicateEventSchedule(organizerId, input.relatedEventId);
    }
    const row = await associationScheduleRepository.create({
      organizer: { connect: { id: organizerId } },
      title: input.title.trim(),
      type: input.type,
      startsAt,
      endsAt: null,
      allDay,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      visibility: input.visibility ?? "PRIVATE",
      relatedUrl: input.relatedUrl?.trim() || null,
      relatedForm: input.relatedFormId
        ? { connect: { id: input.relatedFormId } }
        : undefined,
      relatedNotice: input.relatedNoticeId
        ? { connect: { id: input.relatedNoticeId } }
        : undefined,
      relatedEvent: input.relatedEventId
        ? { connect: { id: input.relatedEventId } }
        : undefined,
      createdByUser: actor.userId
        ? { connect: { id: actor.userId } }
        : undefined,
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.association_schedule_created,
      targetType: "AssociationSchedule",
      targetId: row.id,
      afterData: {
        title: row.title,
        type: row.type,
        relatedEventId: input.relatedEventId ?? null,
      },
    });
    return row;
  },

  async update(
    actor: ActorContext,
    scheduleId: string,
    input: AssociationScheduleUpsertInput,
  ) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const existing = await associationScheduleRepository.findByIdForOrganizer(
      organizerId,
      scheduleId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    }
    const { startsAt, allDay } = resolveScheduleStart(input);
    await validateScheduleRelations(
      organizerId,
      input.relatedFormId,
      input.relatedNoticeId,
      input.relatedEventId ?? existing.relatedEventId,
    );
    const nextRelatedEventId =
      input.relatedEventId ?? existing.relatedEventId ?? null;
    if (nextRelatedEventId) {
      await assertNoDuplicateEventSchedule(
        organizerId,
        nextRelatedEventId,
        scheduleId,
      );
    }
    const row = await associationScheduleRepository.update(scheduleId, {
      title: input.title.trim(),
      type: input.type,
      startsAt,
      endsAt: null,
      allDay,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      visibility: input.visibility ?? "PRIVATE",
      relatedUrl: input.relatedUrl?.trim() || null,
      relatedForm: input.relatedFormId
        ? { connect: { id: input.relatedFormId } }
        : { disconnect: true },
      relatedNotice: input.relatedNoticeId
        ? { connect: { id: input.relatedNoticeId } }
        : { disconnect: true },
      relatedEvent: nextRelatedEventId
        ? { connect: { id: nextRelatedEventId } }
        : { disconnect: true },
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.association_schedule_updated,
      targetType: "AssociationSchedule",
      targetId: row.id,
      afterData: { title: row.title },
    });
    return row;
  },

  async delete(actor: ActorContext, scheduleId: string) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    const existing = await associationScheduleRepository.findByIdForOrganizer(
      organizerId,
      scheduleId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "일정을 찾을 수 없습니다.");
    }
    await associationScheduleRepository.softDelete(scheduleId);
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.association_schedule_deleted,
      targetType: "AssociationSchedule",
      targetId: scheduleId,
    });
  },

  async listFormOptions(actor: ActorContext) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return intakeFormRepository.listFormOptionsForOwner({
      ownerType: "organizer",
      organizerId: scope.organizerId,
    });
  },

  async listNoticeOptions(actor: ActorContext) {
    const organizerId = await requireAssociationScheduleOrganizerScope(actor);
    return associationScheduleRepository.listNoticeOptions(organizerId);
  },
};
