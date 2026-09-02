import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { parseBracketFighterSnapshot } from "@/lib/bracket-snapshot";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import {
  formatDivisionMainLabel,
  toEventDivisionDisplayInput,
} from "@/lib/event-division-fields";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import {
  buildJudgeScoreSheetDocumentTitle,
  buildJudgeScoreSheetPages,
  isJudgeScoreSheetEligibleMatch,
  parseJudgeScoreSheetJudgesParam,
} from "@/lib/judge-score-sheet/format";
import {
  JUDGE_SCORE_SHEET_FOOTER_NOTE,
  type JudgeScoreSheetCornerDto,
  type JudgeScoreSheetDocumentDto,
  type JudgeScoreSheetJudgeNumber,
  type JudgeScoreSheetMatchDto,
  type JudgeScoreSheetMetaDto,
  type JudgeScoreSheetVenueDto,
} from "@/lib/judge-score-sheet/types";
import { parseMatchOperationalSettings } from "@/lib/match-operational-settings";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { matchRepository } from "@/lib/repositories/match.repository";

/**
 * READ ONLY judge score sheet loader.
 * Intentionally avoids match-number resequence helpers and any match UPDATE.
 */
function resolveCorner(
  snapshot: unknown,
  fighter: { name: string } | null,
): JudgeScoreSheetCornerDto {
  const snap = parseBracketFighterSnapshot(snapshot);
  const name =
    snap?.name?.trim() || fighter?.name?.trim() || "—";
  const gymName = snap?.gymName?.trim() || "—";
  return { name, gymName };
}

function resolveRoundCount(
  resultMemo: string | null | undefined,
  sportType: string | null | undefined,
): number {
  const ops = parseMatchOperationalSettings(resultMemo);
  if (ops.settings.roundCount > 0) return ops.settings.roundCount;
  return defaultRoundCountForSport(sportType);
}

export const judgeScoreSheetService = {
  async getMeta(
    actor: ActorContext,
    eventId: string,
  ): Promise<JudgeScoreSheetMetaDto> {
    const doc = await this.loadDocument(actor, eventId, {
      judges: [1],
      courtId: null,
    });
    return {
      eventId: doc.eventId,
      eventName: doc.eventName,
      matchCount: doc.matchCount,
      venues: doc.venues,
    };
  },

  async loadDocument(
    actor: ActorContext,
    eventId: string,
    options?: {
      judges?: JudgeScoreSheetJudgeNumber[];
      judgesParam?: string | null;
      courtId?: string | null;
    },
  ): Promise<JudgeScoreSheetDocumentDto> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const judges =
      options?.judges ??
      parseJudgeScoreSheetJudgesParam(options?.judgesParam ?? null);
    const courtFilter = options?.courtId?.trim() || null;

    const [event, matchRows, courts] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true },
      }),
      matchRepository.listMatchesByEvent(eventId),
      eventCourtRepository.listByEvent(eventId),
    ]);

    const eventName = event?.title?.trim() || "대회";

    const ordered = sortMatchesByCourtSchedule(
      matchRows.map((m) => ({
        ...m,
        matchId: m.id,
        courtId: m.courtId ?? null,
        courtOrder: m.courtOrder ?? null,
        matchNumber: m.matchNumber,
        globalMatchOrder: m.globalMatchOrder,
        matchOrder: m.matchOrder,
      })),
      courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
    );

    const eligible = ordered.filter((m) =>
      isJudgeScoreSheetEligibleMatch({
        status: m.status,
        fighterRedId: m.fighterRedId,
        fighterBlueId: m.fighterBlueId,
      }),
    );

    const filtered = courtFilter
      ? eligible.filter((m) => m.courtId === courtFilter)
      : eligible;

    const matches: JudgeScoreSheetMatchDto[] = filtered.map((m) => {
      const divisionInput = m.bracket.division
        ? toEventDivisionDisplayInput(m.bracket.division)
        : null;
      const divisionLabel = divisionInput
        ? formatDivisionMainLabel(divisionInput)
        : null;

      return {
        matchId: m.id,
        matchNumber: m.matchNumber,
        matchNoLabel: formatCourtScheduleMatchOrderShort({
          matchId: m.id,
          courtId: m.courtId ?? null,
          courtOrder: m.courtOrder ?? null,
          matchNumber: m.matchNumber,
          globalMatchOrder: m.globalMatchOrder,
          matchOrder: m.matchOrder,
        }),
        venueName: m.court?.name?.trim() || null,
        venueId: m.courtId ?? null,
        divisionLabel,
        roundCount: resolveRoundCount(
          (m as { resultMemo?: string | null }).resultMemo,
          m.bracket.division?.sportType ?? null,
        ),
        red: resolveCorner(m.fighterRedSnapshot, m.fighterRed),
        blue: resolveCorner(m.fighterBlueSnapshot, m.fighterBlue),
      };
    });

    const venueCounts = new Map<string, number>();
    for (const m of eligible) {
      if (!m.courtId) continue;
      venueCounts.set(m.courtId, (venueCounts.get(m.courtId) ?? 0) + 1);
    }

    const venues: JudgeScoreSheetVenueDto[] = courts.map((c) => ({
      id: c.id,
      name: c.name,
      matchCount: venueCounts.get(c.id) ?? 0,
    })).filter((v) => v.matchCount > 0);

    const pages = buildJudgeScoreSheetPages(matches, judges);

    return {
      eventId,
      eventName,
      documentTitle: buildJudgeScoreSheetDocumentTitle({
        eventName,
        judges,
      }),
      footerNote: JUDGE_SCORE_SHEET_FOOTER_NOTE,
      judges,
      venueFilterId: courtFilter,
      matchCount: matches.length,
      pageCount: pages.length,
      pages,
      venues,
    };
  },
};
