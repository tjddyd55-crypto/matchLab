import "server-only";

import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { sortMatchesByCourtSchedule } from "@/lib/court-match-order";
import { toEventDivisionDisplayInput } from "@/lib/event-division-fields";
import { BracketMatchStatus } from "@/lib/enums";
import {
  countQueueMatchesUntilTarget,
  formatOperationMatchOrder,
  pickOperationSpotlightMatches,
  sortOperationMatchRows,
} from "@/lib/match-operation-display";
import { parseMyMatchToken } from "@/lib/my-match/token";
import { bracketMatchStatusLabel } from "@/lib/match-status-display";
import {
  buildPublicFighterOutcomeLabel,
  buildPublicResultTypeLabel,
  hasOfficialMatchResults,
} from "@/lib/public-official-result";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { fighterProfileRepository } from "@/lib/repositories/fighter-profile.repository";
import { matchRepository } from "@/lib/repositories/match.repository";

export type PublicMyMatchSpotlightDTO = {
  matchId: string;
  matchNumberLabel: string;
  courtLabel: string;
  fighterRedName: string;
  fighterBlueName: string;
};

export type PublicMyMatchRowDTO = {
  matchId: string;
  matchNumberLabel: string;
  courtLabel: string;
  divisionLabel: string;
  opponentName: string | null;
  opponentGymName: string | null;
  status: BracketMatchStatus;
  statusLabel: string;
  outcomeLabel: string | null;
  resultTypeLabel: string | null;
  isPrimary: boolean;
  matchesUntil: number | null;
};

export type PublicMyMatchPageDTO = {
  eventTitle: string;
  eventSlug: string;
  fighterName: string;
  gymName: string | null;
  fighterProfileSlug: string | null;
  courtLabel: string | null;
  spotlight: {
    current: PublicMyMatchSpotlightDTO | null;
    myMatch: PublicMyMatchSpotlightDTO | null;
    matchesUntil: number | null;
    currentMatchNumberLabel: string | null;
  };
  matches: PublicMyMatchRowDTO[];
};

type EventMatchRow = Awaited<
  ReturnType<typeof matchRepository.listMatchesByEvent>
>[number];

function readOpponent(
  fighterId: string,
  match: EventMatchRow,
): { name: string | null; gymName: string | null } {
  if (match.fighterRedId === fighterId) {
    return {
      name: match.fighterBlue?.name ?? null,
      gymName: match.fighterBlue?.currentGym?.name ?? null,
    };
  }
  if (match.fighterBlueId === fighterId) {
    return {
      name: match.fighterRed?.name ?? null,
      gymName: match.fighterRed?.currentGym?.name ?? null,
    };
  }
  return { name: null, gymName: null };
}

function toSpotlightDTO(match: EventMatchRow): PublicMyMatchSpotlightDTO {
  return {
    matchId: match.id,
    matchNumberLabel: formatOperationMatchOrder({
      matchNumber: match.matchNumber,
      globalMatchOrder: match.globalMatchOrder,
      matchOrder: match.matchOrder,
    }),
    courtLabel: match.court?.name ?? "—",
    fighterRedName: match.fighterRed?.name ?? "—",
    fighterBlueName: match.fighterBlue?.name ?? "—",
  };
}

function buildCourtQueueRows(
  allEventMatches: EventMatchRow[],
  courtId: string,
  courts: { id: string; sortOrder: number }[],
) {
  return sortOperationMatchRows(
    allEventMatches
      .filter((m) => m.courtId === courtId)
      .map((m) => ({
        matchId: m.id,
        courtId: m.courtId,
        courtOrder: m.courtOrder,
        matchNumber: m.matchNumber,
        globalMatchOrder: m.globalMatchOrder,
        matchOrder: m.matchOrder,
        status: m.status,
        hasOfficialResults: hasOfficialMatchResults(m.matchResults),
      })),
    courtId,
    courts,
  );
}

export const myMatchService = {
  async getPublicPageByToken(
    routeSlug: string,
    token: string,
  ): Promise<PublicMyMatchPageDTO | null> {
    const payload = parseMyMatchToken(token);
    if (!payload || payload.eventSlug !== routeSlug) return null;

    const event = await eventRepository.findPublicSummaryBySlug(routeSlug);
    if (!event) return null;

    const allEventMatches = await matchRepository.listMatchesByEvent(event.id);
    const eventMatches = allEventMatches.filter(
      (m) =>
        m.fighterRedId === payload.fighterId ||
        m.fighterBlueId === payload.fighterId,
    );
    if (eventMatches.length === 0) return null;

    const fighterRow =
      eventMatches.find((m) => m.fighterRedId === payload.fighterId)?.fighterRed ??
      eventMatches.find((m) => m.fighterBlueId === payload.fighterId)?.fighterBlue;
    if (!fighterRow) return null;

    const courts = await eventCourtRepository.listAllByEvent(event.id);

    const primaryMatch =
      eventMatches.find(
        (m) =>
          m.status !== BracketMatchStatus.finished &&
          m.status !== BracketMatchStatus.cancelled,
      ) ?? eventMatches[eventMatches.length - 1]!;

    const courtId = primaryMatch.courtId;
    const courtRows = courtId
      ? buildCourtQueueRows(allEventMatches, courtId, courts)
      : [];

    const spotlight = pickOperationSpotlightMatches(courtRows);
    const matchesUntil =
      courtId &&
      primaryMatch.status !== BracketMatchStatus.finished &&
      primaryMatch.status !== BracketMatchStatus.cancelled
        ? countQueueMatchesUntilTarget(courtRows, primaryMatch.id)
        : null;

    const courtSpotlightCurrent = spotlight.current
      ? allEventMatches.find((m) => m.id === spotlight.current!.matchId)
      : null;

    const profile = await fighterProfileRepository.findByFighterId(payload.fighterId);
    const fighterProfileSlug =
      profile?.isPublic && profile.slug ? profile.slug : null;

    const courtLabel =
      primaryMatch.court?.name ??
      courts.find((c) => c.id === courtId)?.name ??
      null;

    const matches: PublicMyMatchRowDTO[] = sortMatchesByCourtSchedule(
      eventMatches.map((m) => ({
        ...m,
        matchId: m.id,
      })),
      courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
    ).map((m) => {
      const division = toEventDivisionDisplayInput(m.bracket.division);
      const divisionLabel = division
        ? formatDivisionNameLabel(division)
        : m.bracket.title;
      const opponent = readOpponent(payload.fighterId, m);
      const official = hasOfficialMatchResults(m.matchResults);
      const outcomeLabel = official
        ? buildPublicFighterOutcomeLabel(payload.fighterId, {
            winnerId: m.winnerId,
            loserId: m.loserId,
            matchResults: m.matchResults,
          })
        : null;
      const resultTypeLabel = official
        ? buildPublicResultTypeLabel(m.matchResults, m.resultType)
        : null;

      const isPrimary = m.id === primaryMatch.id;
      const rowMatchesUntil =
        isPrimary &&
        m.courtId &&
        m.status !== BracketMatchStatus.finished &&
        m.status !== BracketMatchStatus.cancelled
          ? countQueueMatchesUntilTarget(
              buildCourtQueueRows(allEventMatches, m.courtId, courts),
              m.id,
            )
          : null;

      return {
        matchId: m.id,
        matchNumberLabel: formatOperationMatchOrder({
          matchNumber: m.matchNumber,
          globalMatchOrder: m.globalMatchOrder,
          matchOrder: m.matchOrder,
        }),
        courtLabel: m.court?.name ?? "—",
        divisionLabel,
        opponentName: opponent.name,
        opponentGymName: opponent.gymName,
        status: m.status,
        statusLabel: bracketMatchStatusLabel(m.status),
        outcomeLabel,
        resultTypeLabel,
        isPrimary,
        matchesUntil: rowMatchesUntil,
      };
    });

    return {
      eventTitle: event.title,
      eventSlug: routeSlug,
      fighterName: fighterRow.name,
      gymName: fighterRow.currentGym?.name ?? null,
      fighterProfileSlug,
      courtLabel,
      spotlight: {
        current: courtSpotlightCurrent
          ? toSpotlightDTO(courtSpotlightCurrent)
          : null,
        myMatch: toSpotlightDTO(primaryMatch),
        matchesUntil,
        currentMatchNumberLabel: courtSpotlightCurrent
          ? formatOperationMatchOrder({
              matchNumber: courtSpotlightCurrent.matchNumber,
              globalMatchOrder: courtSpotlightCurrent.globalMatchOrder,
              matchOrder: courtSpotlightCurrent.matchOrder,
            })
          : null,
      },
      matches,
    };
  },
};
