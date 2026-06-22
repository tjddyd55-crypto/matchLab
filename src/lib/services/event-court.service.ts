import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import {
  formatCourtRuleLabel,
  resolveCourtIdFromRules,
} from "@/lib/court-assignment";
import {
  computeCourtOrderUpdates,
  renumberAllCourtOrders,
  type CourtScheduleMatch,
} from "@/lib/court-match-order";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { matchRepository } from "@/lib/repositories/match.repository";

export type EventCourtRuleVM = {
  id: string;
  divisionId: string | null;
  divisionLabel: string | null;
  weightClassLabel: string | null;
  displayLabel: string;
};

export type EventCourtVM = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  assignedMatchCount: number;
  rules: EventCourtRuleVM[];
  /** @deprecated rules 사용 권장 */
  divisions: { id: string; label: string }[];
};

function mapRule(
  r: Awaited<
    ReturnType<typeof eventCourtRepository.listAllByEvent>
  >[number]["divisionRules"][number],
): EventCourtRuleVM {
  const divisionLabel = r.division
    ? formatDivisionNameLabel(r.division)
    : null;
  return {
    id: r.id,
    divisionId: r.divisionId,
    divisionLabel,
    weightClassLabel: r.weightClassLabel,
    displayLabel: formatCourtRuleLabel({
      divisionLabel,
      weightClassLabel: r.weightClassLabel,
    }),
  };
}

async function requireActiveCourtForEvent(
  eventId: string,
  courtId: string,
): Promise<void> {
  const court = await eventCourtRepository.findById(courtId);
  if (!court || court.eventId !== eventId) {
    throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
  }
  if (!court.isActive) {
    throw new AppError(
      "VALIDATION_ERROR",
      "비활성 경기장에는 배정할 수 없습니다. 활성 경기장을 선택해 주세요.",
    );
  }
}

export const eventCourtService = {
  async listForOrganizer(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventCourtVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const [rows, matchCounts] = await Promise.all([
      eventCourtRepository.listAllByEvent(eventId),
      matchRepository.countMatchesByCourtForEvent(eventId),
    ]);
    return rows.map((c) => {
      const rules = c.divisionRules.map(mapRule);
      return {
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        assignedMatchCount: matchCounts.get(c.id) ?? 0,
        rules,
        divisions: rules
          .filter((r) => r.divisionId)
          .map((r) => ({
            id: r.divisionId!,
            label: r.displayLabel,
          })),
      };
    });
  },

  async createCourt(
    actor: ActorContext,
    eventId: string,
    name: string,
  ): Promise<EventCourtVM> {
    await requireOrganizerForEvent(actor, eventId);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기장 이름은 1~100자로 입력해 주세요.",
      );
    }
    const dup = await eventCourtRepository.findDuplicateName(eventId, trimmed);
    if (dup) {
      throw new AppError(
        "CONFLICT",
        "같은 이름의 활성 경기장이 이미 있습니다.",
      );
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
      assignedMatchCount: 0,
      rules: [],
      divisions: [],
    };
  },

  async assignRule(
    actor: ActorContext,
    eventId: string,
    courtId: string,
    input: {
      divisionId?: string | null;
      weightClassLabel?: string | null;
    },
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const court = await eventCourtRepository.findById(courtId);
    if (!court || court.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
    }

    const divisionId = input.divisionId?.trim() || null;
    const weightClassLabel = input.weightClassLabel?.trim() || null;

    if (!divisionId && !weightClassLabel) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기구분 또는 체급을 선택해 주세요.",
      );
    }

    if (divisionId) {
      const event =
        await eventRepository.findEventWithDivisionsForApplication(eventId);
      if (!event?.divisions.some((d) => d.id === divisionId)) {
        throw new AppError("NOT_FOUND", "경기구분을 찾을 수 없습니다.");
      }
    }

    await eventCourtRepository.createDivisionRule({
      eventId,
      courtId,
      divisionId,
      weightClassLabel,
    });
  },

  /** @deprecated assignRule 사용 */
  async assignDivision(
    actor: ActorContext,
    eventId: string,
    courtId: string,
    divisionId: string,
  ): Promise<void> {
    return eventCourtService.assignRule(actor, eventId, courtId, {
      divisionId,
    });
  },

  async removeRule(
    actor: ActorContext,
    eventId: string,
    ruleId: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    await eventCourtRepository.deactivateDivisionRule(ruleId);
  },

  async setMatchCourt(
    actor: ActorContext,
    eventId: string,
    matchId: string,
    courtId: string | null,
    courtOrder?: number | null,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);

    const allRows = await matchRepository.listMatchesByEvent(eventId);
    const allMatches: CourtScheduleMatch[] = allRows.map((m) => ({
      matchId: m.id,
      courtId: m.courtId,
      courtOrder: m.courtOrder,
    }));

    if (!courtId) {
      const moving = allMatches.find((m) => m.matchId === matchId);
      if (!moving) {
        throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
      }
      const merged = allMatches.map((m) =>
        m.matchId === matchId
          ? { ...m, courtId: null, courtOrder: null }
          : m,
      );
      const updates = renumberAllCourtOrders(merged);
      await prisma.$transaction(async (tx) => {
        for (const u of updates) {
          await matchRepository.updateMatchCourt(
            u.matchId,
            { courtId: u.courtId, courtOrder: u.courtOrder },
            tx,
          );
        }
      });
      return;
    }

    await requireActiveCourtForEvent(eventId, courtId);

    const updates = computeCourtOrderUpdates({
      allMatches,
      movingMatchId: matchId,
      targetCourtId: courtId,
      targetPosition: courtOrder,
    });

    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await matchRepository.updateMatchCourt(
          u.matchId,
          { courtId: u.courtId, courtOrder: u.courtOrder },
          tx,
        );
      }
    });
  },

  async ensureActiveCourtForEvent(
    actor: ActorContext,
    eventId: string,
    courtId: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    await requireActiveCourtForEvent(eventId, courtId);
  },

  async suggestCourtForDivision(
    eventId: string,
    division: { id: string; weightClass: string | null },
  ): Promise<string | null> {
    const rules = await eventCourtRepository.listActiveRulesByEvent(eventId);
    return resolveCourtIdFromRules(rules, division);
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
    if (!trimmed || trimmed.length > 100) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기장 이름은 1~100자로 입력해 주세요.",
      );
    }
    const dup = await eventCourtRepository.findDuplicateName(
      eventId,
      trimmed,
      courtId,
    );
    if (dup) {
      throw new AppError(
        "CONFLICT",
        "같은 이름의 활성 경기장이 이미 있습니다.",
      );
    }
    await eventCourtRepository.update(courtId, { name: trimmed });
  },

  async reorderCourts(
    actor: ActorContext,
    eventId: string,
    orderedCourtIds: string[],
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const courts = await eventCourtRepository.listAllByEvent(eventId);
    const validIds = new Set(courts.map((c) => c.id));
    for (const id of orderedCourtIds) {
      if (!validIds.has(id)) {
        throw new AppError("VALIDATION_ERROR", "잘못된 경기장 순서입니다.");
      }
    }
    await eventCourtRepository.reorderCourts(eventId, orderedCourtIds);
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

  async activateCourt(
    actor: ActorContext,
    eventId: string,
    courtId: string,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);
    const court = await eventCourtRepository.findById(courtId);
    if (!court || court.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
    }
    const dup = await eventCourtRepository.findDuplicateName(
      eventId,
      court.name,
      courtId,
    );
    if (dup) {
      throw new AppError(
        "CONFLICT",
        "같은 이름의 활성 경기장이 이미 있습니다.",
      );
    }
    await eventCourtRepository.update(courtId, { isActive: true });
  },

  async updateMatchSchedule(
    actor: ActorContext,
    eventId: string,
    updates: { matchId: string; courtId: string | null; courtOrder: number | null }[],
  ): Promise<void> {
    await requireOrganizerForEvent(actor, eventId);

    const allRows = await matchRepository.listMatchesByEvent(eventId);
    const state = new Map<string, CourtScheduleMatch>(
      allRows.map((m) => [
        m.id,
        { matchId: m.id, courtId: m.courtId, courtOrder: m.courtOrder },
      ]),
    );

    for (const u of updates) {
      if (!state.has(u.matchId)) continue;
      if (u.courtId) {
        await requireActiveCourtForEvent(eventId, u.courtId);
      }
      state.set(u.matchId, {
        matchId: u.matchId,
        courtId: u.courtId,
        courtOrder: u.courtOrder,
      });
    }

    const finalUpdates = renumberAllCourtOrders(Array.from(state.values()));

    await prisma.$transaction(async (tx) => {
      for (const u of finalUpdates) {
        await matchRepository.updateMatchCourt(
          u.matchId,
          { courtId: u.courtId, courtOrder: u.courtOrder },
          tx,
        );
      }
    });
  },
};
