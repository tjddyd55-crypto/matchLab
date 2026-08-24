import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { prisma } from "@/lib/prisma";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";
import { toEventDivisionDisplayInput } from "@/lib/event-division-fields";
import { composeEventVenueDisplay } from "@/lib/services/event.service";
import {
  formatCourtScheduleMatchOrderShort,
  sortMatchesByCourtSchedule,
} from "@/lib/court-match-order";
import { parseBracketFighterSnapshot } from "@/lib/bracket-snapshot";
import {
  buildBracketPrintDocumentTitle,
  buildBracketPrintFighterDto,
  formatBracketPrintEventDate,
  parseApplicantNameFromSnapshot,
  type BracketPrintDocumentDto,
  type BracketPrintFighterDto,
  type BracketPrintMatchDto,
} from "@/lib/brackets/bracket-print-format";

type PrintApplicationRow = {
  id: string;
  fighterId: string;
  divisionId: string | null;
  status: string;
  fighterSnapshot: unknown;
  gymSnapshot: unknown;
  gymNameSnapshot: string | null;
  recordText: string | null;
  totalBoutsSnapshot: number | null;
  winsSnapshot: number | null;
  drawsSnapshot: number | null;
  lossesSnapshot: number | null;
  schoolLevelSnapshot: string | null;
  schoolGradeSnapshot: number | null;
  gym: { name: string } | null;
  fighter: {
    id: string;
    name: string;
    recordTotalBouts: number;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  };
};

function applicationLookupKey(fighterId: string, divisionId: string | null) {
  return `${fighterId}::${divisionId ?? ""}`;
}

function pickApplication(
  map: Map<string, PrintApplicationRow[]>,
  fighterId: string,
  divisionId: string | null,
): PrintApplicationRow | null {
  const exact = map.get(applicationLookupKey(fighterId, divisionId));
  if (exact && exact.length > 0) {
    return (
      exact.find((a) => a.status === "approved" || a.status === "pending") ??
      exact[0]!
    );
  }
  if (divisionId) {
    const anyDiv = map.get(applicationLookupKey(fighterId, null));
    if (anyDiv && anyDiv.length > 0) return anyDiv[0]!;
  }
  // fallback: first app for fighter in any division
  for (const [key, rows] of map) {
    if (key.startsWith(`${fighterId}::`) && rows[0]) return rows[0];
  }
  return null;
}

function mapPrintFighter(
  fighter: {
    id: string;
    name: string;
  } | null,
  matchSnapshot: unknown,
  app: PrintApplicationRow | null,
): BracketPrintFighterDto | null {
  if (!fighter && !app) return null;

  const snap = parseBracketFighterSnapshot(matchSnapshot);
  const nameFromApp = app
    ? parseApplicantNameFromSnapshot(app.fighterSnapshot)
    : null;
  const name =
    nameFromApp ||
    snap?.name?.trim() ||
    app?.fighter.name?.trim() ||
    fighter?.name?.trim() ||
    "미정";

  if (!app) {
    return buildBracketPrintFighterDto({
      name,
      gymNameSnapshot: snap?.gymName ?? null,
      gymSnapshot: null,
      gymRelationName: null,
      fighterSnapshot: null,
      schoolLevelSnapshot: null,
      schoolGradeSnapshot: null,
      totalBoutsSnapshot: null,
      winsSnapshot: null,
      drawsSnapshot: null,
      lossesSnapshot: null,
      recordText: snap?.recordSummary ?? null,
      fighterRecord: null,
    });
  }

  return buildBracketPrintFighterDto({
    name,
    gymNameSnapshot: app.gymNameSnapshot,
    gymSnapshot: app.gymSnapshot,
    gymRelationName: app.gym?.name ?? null,
    fighterSnapshot: app.fighterSnapshot,
    schoolLevelSnapshot: app.schoolLevelSnapshot,
    schoolGradeSnapshot: app.schoolGradeSnapshot,
    totalBoutsSnapshot: app.totalBoutsSnapshot,
    winsSnapshot: app.winsSnapshot,
    drawsSnapshot: app.drawsSnapshot,
    lossesSnapshot: app.lossesSnapshot,
    recordText: app.recordText,
    fighterRecord: {
      recordTotalBouts: app.fighter.recordTotalBouts,
      recordWin: app.fighter.recordWin,
      recordLoss: app.fighter.recordLoss,
      recordDraw: app.fighter.recordDraw,
    },
  });
}

export const bracketPrintService = {
  async getOrganizerBracketPrintDocument(
    actor: ActorContext,
    eventId: string,
  ): Promise<BracketPrintDocumentDto> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const [event, matchRows, applications, courts] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          eventDate: true,
          location: true,
          locationName: true,
          roadAddress: true,
          detailAddress: true,
        },
      }),
      matchRepository.listMatchesByEvent(eventId),
      prisma.eventApplication.findMany({
        where: {
          eventId,
          status: { in: ["pending", "approved"] },
        },
        select: {
          id: true,
          fighterId: true,
          divisionId: true,
          status: true,
          fighterSnapshot: true,
          gymSnapshot: true,
          gymNameSnapshot: true,
          recordText: true,
          totalBoutsSnapshot: true,
          winsSnapshot: true,
          drawsSnapshot: true,
          lossesSnapshot: true,
          schoolLevelSnapshot: true,
          schoolGradeSnapshot: true,
          gym: { select: { name: true } },
          fighter: {
            select: {
              id: true,
              name: true,
              recordTotalBouts: true,
              recordWin: true,
              recordLoss: true,
              recordDraw: true,
            },
          },
        },
      }),
      eventCourtRepository.listByEvent(eventId),
    ]);

    if (!event) {
      return {
        eventId,
        eventName: "",
        eventDateLabel: null,
        venueLabel: null,
        documentTitle: buildBracketPrintDocumentTitle("대회"),
        matches: [],
      };
    }

    const appMap = new Map<string, PrintApplicationRow[]>();
    for (const row of applications as PrintApplicationRow[]) {
      const key = applicationLookupKey(row.fighterId, row.divisionId);
      const list = appMap.get(key) ?? [];
      list.push(row);
      appMap.set(key, list);
    }

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

    const matches: BracketPrintMatchDto[] = ordered.map((m) => {
      const divisionInput = m.bracket.division
        ? toEventDivisionDisplayInput(m.bracket.division)
        : null;
      const divisionLabel = divisionInput
        ? formatDivisionMainLabel(divisionInput)
        : null;
      const divisionId = m.bracket.divisionId ?? null;

      const redApp = m.fighterRed
        ? pickApplication(appMap, m.fighterRed.id, divisionId)
        : null;
      const blueApp = m.fighterBlue
        ? pickApplication(appMap, m.fighterBlue.id, divisionId)
        : null;

      return {
        matchId: m.id,
        matchNoLabel: formatCourtScheduleMatchOrderShort({
          matchId: m.id,
          courtId: m.courtId ?? null,
          courtOrder: m.courtOrder ?? null,
          matchNumber: m.matchNumber,
          globalMatchOrder: m.globalMatchOrder,
          matchOrder: m.matchOrder,
        }),
        divisionLabel,
        arenaName: m.court?.name?.trim() || null,
        red: mapPrintFighter(m.fighterRed, m.fighterRedSnapshot, redApp),
        blue: mapPrintFighter(m.fighterBlue, m.fighterBlueSnapshot, blueApp),
      };
    });

    const venueLabel = composeEventVenueDisplay(event).trim() || null;

    return {
      eventId: event.id,
      eventName: event.title,
      eventDateLabel: formatBracketPrintEventDate(event.eventDate),
      venueLabel,
      documentTitle: buildBracketPrintDocumentTitle(event.title),
      matches,
    };
  },
};
