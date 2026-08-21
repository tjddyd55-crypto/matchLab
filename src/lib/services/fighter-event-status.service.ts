import "server-only";

import type {
  ApplicationStatus,
  BracketMatchStatus,
  PaymentStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import { AppError } from "@/lib/errors/app-error";
import {
  computeFieldEligibility,
  getCheckInStatusLabel,
  getWeighInStatusLabel,
} from "@/lib/field-eligibility";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { bracketMatchStatusLabel } from "@/lib/match-status-display";
import { requireRole } from "@/lib/permissions";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { matchRepository } from "@/lib/repositories/match.repository";

export type FighterPaymentDisplayLabel = string;

export type FighterApplicationStatusRowDTO = {
  applicationId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStatus: import("@/generated/prisma").EventStatus;
  gymName: string;
  divisionLabel: string;
  applicationStatus: ApplicationStatus;
  paymentDisplayLabel: FighterPaymentDisplayLabel;
  checkInStatusLabel: string;
  weighInStatusLabel: string;
  isEligibleForBracket: boolean;
  eligibilityLabel: string;
  bracketGenerated: boolean;
  bracketAssigned: boolean;
  opponentName: string | null;
  opponentGymName: string | null;
  matchNumber: number | null;
  globalMatchOrder: number | null;
  matchStatusLabel: string | null;
  resultSummary: string | null;
  appliedAt: string | null;
};

export type FighterMatchRowDTO = {
  matchId: string;
  eventId: string;
  eventTitle: string;
  publicSlug: string;
  bracketTitle: string;
  divisionLabel: string;
  opponentName: string | null;
  opponentGymName: string | null;
  matchNumber: number | null;
  globalMatchOrder: number | null;
  matchStatus: BracketMatchStatus;
  matchStatusLabel: string;
  resultSummary: string | null;
};

export type FighterEventsPageDTO = {
  applications: FighterApplicationStatusRowDTO[];
  matches: FighterMatchRowDTO[];
};

function fighterPaymentDisplayLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "입금 확인";
    case "waived":
      return "면제";
    case "refunded":
      return "환불 처리";
    default:
      return "체육관/주최자 확인 중";
  }
}

function buildMatchResultSummary(
  perspectiveFighterId: string,
  match: {
    status: BracketMatchStatus;
    winnerId: string | null;
    loserId: string | null;
    resultType: import("@/generated/prisma").BracketMatchOutcomeStyle | null;
    matchResults: { fighterId: string }[];
  },
): string | null {
  const hasOfficial = (match.matchResults ?? []).length >= 2;
  if (hasOfficial && match.winnerId) {
    if (match.winnerId === perspectiveFighterId) return "승리";
    if (match.loserId === perspectiveFighterId) return "패배";
  }
  if (match.status === "finished" && match.resultType) {
    return outcomeStylePublicLabel(match.resultType) ?? "종료";
  }
  if (match.status === "finished") return "종료";
  return null;
}

type FighterMatchRow = Awaited<
  ReturnType<typeof matchRepository.findMatchesForFighter>
>[number];

function mapFighterPerspective(m: FighterMatchRow, fighterId: string) {
  if (m.fighterRedId === fighterId) {
    return {
      opponentName: m.fighterBlue?.name ?? null,
      opponentGymName: m.fighterBlue?.currentGym?.name ?? null,
    };
  }
  if (m.fighterBlueId === fighterId) {
    return {
      opponentName: m.fighterRed?.name ?? null,
      opponentGymName: m.fighterRed?.currentGym?.name ?? null,
    };
  }
  return null;
}

export const fighterEventStatusService = {
  async listFighterApplications(
    actor: ActorContext,
  ): Promise<FighterApplicationStatusRowDTO[]> {
    const page = await fighterEventStatusService.getFighterEventsPage(actor);
    return page.applications;
  },

  async listFighterMatches(actor: ActorContext): Promise<FighterMatchRowDTO[]> {
    const page = await fighterEventStatusService.getFighterEventsPage(actor);
    return page.matches;
  },

  async getFighterEventsPage(actor: ActorContext): Promise<FighterEventsPageDTO> {
    requireRole(actor, ["fighter", "admin"]);
    const fighterId = actor.fighterId;
    if (!fighterId) {
      throw new AppError(
        "FORBIDDEN",
        "선수 프로필이 연결되지 않았습니다.",
      );
    }

    const [applications, allMatches] = await Promise.all([
      applicationRepository.listFighterApplicationsWithField(fighterId),
      matchRepository.findMatchesForFighter(fighterId),
    ]);

    const eventIds = [...new Set(applications.map((a) => a.event.id))];
    const bracketGeneratedByEvent = new Map<string, boolean>();
    const placedByEvent = new Map<string, Set<string>>();

    await Promise.all(
      eventIds.map(async (eventId) => {
        const [brackets, placed] = await Promise.all([
          bracketRepository.listBracketsByEvent(eventId),
          bracketRepository.listPlacedFighterIdsForEvent(eventId),
        ]);
        bracketGeneratedByEvent.set(eventId, brackets.length > 0);
        placedByEvent.set(eventId, new Set(placed));
      }),
    );

    const matchByEvent = new Map<string, FighterMatchRow>();
    for (const m of allMatches) {
      const eventId = m.bracket.event.id;
      const existing = matchByEvent.get(eventId);
      if (!existing) {
        matchByEvent.set(eventId, m);
        continue;
      }
      const curOrder = existing.globalMatchOrder ?? existing.matchOrder;
      const nextOrder = m.globalMatchOrder ?? m.matchOrder;
      if (nextOrder < curOrder) {
        matchByEvent.set(eventId, m);
      }
    }

    const applicationRows: FighterApplicationStatusRowDTO[] = applications.map(
      (row) => {
        const eventId = row.event.id;
        const eligibility = computeFieldEligibility({
          checkInStatus: row.checkInStatus,
          weighInStatus: row.weighInStatus,
        });
        const bracketGenerated = bracketGeneratedByEvent.get(eventId) ?? false;
        const placed = placedByEvent.get(eventId);
        const bracketAssigned = placed?.has(fighterId) ?? false;
        const matchEntry = matchByEvent.get(eventId);
        const perspective = matchEntry
          ? mapFighterPerspective(matchEntry, fighterId)
          : null;

        return {
          applicationId: row.id,
          eventId,
          eventTitle: row.event.title,
          eventSlug: row.event.publicSlug,
          eventStatus: row.event.status,
          gymName: row.gym.name,
          divisionLabel: formatApplicationDivisionLabel({
            division: row.division,
            divisionSelectionType: row.divisionSelectionType,
            requestedDivisionText: row.requestedDivisionText,
          }),
          applicationStatus: row.status,
          paymentDisplayLabel: fighterPaymentDisplayLabel(row.paymentStatus),
          checkInStatusLabel: getCheckInStatusLabel(row.checkInStatus),
          weighInStatusLabel: getWeighInStatusLabel(row.weighInStatus),
          isEligibleForBracket: eligibility.isEligibleForBracket,
          eligibilityLabel: eligibility.eligibilityLabel,
          bracketGenerated,
          bracketAssigned,
          opponentName: perspective?.opponentName ?? null,
          opponentGymName: perspective?.opponentGymName ?? null,
          matchNumber: matchEntry?.matchNumber ?? null,
          globalMatchOrder: matchEntry?.globalMatchOrder ?? null,
          matchStatusLabel: matchEntry
            ? bracketMatchStatusLabel(matchEntry.status)
            : null,
          resultSummary: matchEntry
            ? buildMatchResultSummary(fighterId, {
                status: matchEntry.status,
                winnerId: matchEntry.winnerId,
                loserId: matchEntry.loserId,
                resultType: matchEntry.resultType,
                matchResults: matchEntry.matchResults ?? [],
              })
            : null,
          appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
        };
      },
    );

    const matchRows: FighterMatchRowDTO[] = allMatches.map((m) => {
      const perspective = mapFighterPerspective(m, fighterId);
      const divisionLabel = m.bracket.division
        ? formatDivisionNameLabel(m.bracket.division)
        : m.bracket.title;
      return {
        matchId: m.id,
        eventId: m.bracket.event.id,
        eventTitle: m.bracket.event.title,
        publicSlug: m.bracket.event.publicSlug,
        bracketTitle: m.bracket.title,
        divisionLabel,
        opponentName: perspective?.opponentName ?? null,
        opponentGymName: perspective?.opponentGymName ?? null,
        matchNumber: m.matchNumber,
        globalMatchOrder: m.globalMatchOrder,
        matchStatus: m.status,
        matchStatusLabel: bracketMatchStatusLabel(m.status),
        resultSummary: buildMatchResultSummary(fighterId, {
          status: m.status,
          winnerId: m.winnerId,
          loserId: m.loserId,
          resultType: m.resultType,
          matchResults: m.matchResults ?? [],
        }),
      };
    });

    return {
      applications: applicationRows,
      matches: matchRows,
    };
  },
};
