import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { matchRepository } from "@/lib/repositories/match.repository";

export type EventCourtVM = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  divisions: { id: string; label: string }[];
};

export const eventCourtService = {
  async listForOrganizer(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventCourtVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const rows = await eventCourtRepository.listAllByEvent(eventId);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      divisions: c.divisionRules.map((r) => ({
        id: r.division.id,
        label: formatDivisionNameLabel(r.division),
      })),
    }));
  },

  async createCourt(
    actor: ActorContext,
    eventId: string,
    name: string,
  ): Promise<EventCourtVM> {
    await requireOrganizerForEvent(actor, eventId);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new AppError("VALIDATION_ERROR", "경기장 이름을 입력해 주세요.");
    }
    const existing = await eventCourtRepository.listByEvent(eventId);
    const row = await eventCourtRepository.create({
      event: { connect: { id: eventId } },
      name: trimmed,
      sortOrder: existing.length,
    });
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      divisions: [],
    };
  },

  async assignDivision(
    actor: ActorContext,
    eventId: string,
    courtId: string,
    divisionId: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const court = await eventCourtRepository.findById(courtId);
    if (!court || court.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
    }
    const event = await eventRepository.findEventWithDivisionsForApplication(
      eventId,
    );
    if (!event?.divisions.some((d) => d.id === divisionId)) {
      throw new AppError("NOT_FOUND", "경기구분을 찾을 수 없습니다.");
    }
    await eventCourtRepository.upsertDivisionRule({
      eventId,
      courtId,
      divisionId,
    });
  },

  async setMatchCourt(
    actor: ActorContext,
    eventId: string,
    matchId: string,
    courtId: string | null,
    courtOrder?: number | null,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    if (courtId) {
      const court = await eventCourtRepository.findById(courtId);
      if (!court || court.eventId !== eventId) {
        throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
      }
    }
    await matchRepository.updateMatchCourt(matchId, {
      courtId,
      courtOrder: courtOrder ?? null,
    });
  },

  async listScheduleMatches(actor: ActorContext, eventId: string) {
    await requireOrganizerForEvent(actor, eventId);
    const [courts, matches] = await Promise.all([
      eventCourtRepository.listAllByEvent(eventId),
      matchRepository.listMatchesByEvent(eventId),
    ]);
    return { courts, matches };
  },

  async updateCourtName(
    actor: ActorContext,
    eventId: string,
    courtId: string,
    name: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const court = await eventCourtRepository.findById(courtId);
    if (!court || court.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new AppError("VALIDATION_ERROR", "경기장 이름을 입력해 주세요.");
    }
    await eventCourtRepository.update(courtId, { name: trimmed });
  },

  async deactivateCourt(
    actor: ActorContext,
    eventId: string,
    courtId: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const court = await eventCourtRepository.findById(courtId);
    if (!court || court.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
    }
    await eventCourtRepository.update(courtId, { isActive: false });
  },

  async updateMatchSchedule(
    actor: ActorContext,
    eventId: string,
    updates: { matchId: string; courtId: string | null; courtOrder: number | null }[],
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    for (const u of updates) {
      if (u.courtId) {
        const court = await eventCourtRepository.findById(u.courtId);
        if (!court || court.eventId !== eventId || !court.isActive) {
          throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
        }
      }
      await matchRepository.updateMatchCourt(u.matchId, {
        courtId: u.courtId,
        courtOrder: u.courtOrder,
      });
    }
  },
};
