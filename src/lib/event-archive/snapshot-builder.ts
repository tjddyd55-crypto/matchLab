import "server-only";

import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import type { ApplicantExcelExportRow } from "@/lib/applications/applicant-excel-export-fields";
import {
  buildApplicantAssignmentCountMap,
  resolveApplicantAssignmentCount,
} from "@/lib/applications/applicant-list-filters";
import {
  parseBracketFighterSnapshot,
  type BracketFighterSnapshotPayload,
} from "@/lib/bracket-snapshot";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  ORGANIZER_EVENT_STATUS_LABELS,
} from "@/lib/event-organizer-status";
import {
  formatDivisionMainLabel,
  toEventDivisionDisplayInput,
} from "@/lib/event-division-fields";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";
import {
  BracketMatchStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
} from "@/lib/enums";
import {
  getBracketMatchStatusLabel,
} from "@/lib/ui/match-status-ui";
import {
  matchRecordStatusKo,
  outcomeStylePublicLabel,
} from "@/lib/match-result-snapshot";
import { prisma } from "@/lib/prisma";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import { resultRepository } from "@/lib/repositories/result.repository";
import { additionalInfoService } from "@/lib/services/additional-info.service";
import type {
  EventArchiveApplicantsSnapshot,
  EventArchiveBracketMatchSnapshot,
  EventArchiveBracketSnapshot,
  EventArchiveCornerSnapshot,
  EventArchiveEventSnapshot,
  EventArchiveFinishSummary,
  EventArchiveResultRowSnapshot,
  EventArchiveResultsSnapshot,
} from "@/lib/event-archive/types";

function toIso(d: Date): string {
  return d.toISOString();
}

function formatEventLocation(row: {
  locationName: string | null;
  roadAddress: string | null;
  location: string | null;
}): string {
  return (
    row.locationName?.trim() ||
    row.roadAddress?.trim() ||
    row.location?.trim() ||
    "—"
  );
}

function formatRegistrationPeriod(
  start: Date,
  end: Date,
): string {
  return `${formatUtcDateOnly(start)} ~ ${formatUtcDateOnly(end)}`;
}

function outcomeKo(o: MatchRecordOutcome): string {
  switch (o) {
    case MatchRecordOutcome.win:
      return "승";
    case MatchRecordOutcome.loss:
      return "패";
    case MatchRecordOutcome.draw:
      return "무";
    case MatchRecordOutcome.no_contest:
      return "노콘";
    default:
      return String(o);
  }
}

function cornerFromSnapshot(
  snapshot: unknown,
  live: {
    id: string;
    name: string;
    currentGym: { name: string } | null;
  } | null,
): EventArchiveCornerSnapshot | null {
  const parsed: BracketFighterSnapshotPayload | null =
    parseBracketFighterSnapshot(snapshot);
  if (parsed) {
    return {
      fighterId: parsed.fighterId,
      name: parsed.name,
      gymName: parsed.gymName,
      recordSummary: parsed.recordSummary,
    };
  }
  if (!live) return null;
  return {
    fighterId: live.id,
    name: live.name,
    gymName: live.currentGym?.name ?? null,
    recordSummary: null,
  };
}

export async function buildEventArchiveFinishSummary(
  eventId: string,
): Promise<EventArchiveFinishSummary> {
  const [applicationCount, matches, divisions] = await Promise.all([
    prisma.eventApplication.count({ where: { eventId } }),
    matchRepository.listMatchesByEvent(eventId),
    prisma.eventDivision.count({ where: { eventId } }),
  ]);

  const terminal = new Set<string>([
    BracketMatchStatus.finished,
    BracketMatchStatus.cancelled,
  ]);
  const completedMatchCount = matches.filter((m) =>
    terminal.has(m.status),
  ).length;

  return {
    applicantCount: applicationCount,
    totalMatchCount: matches.length,
    completedMatchCount,
    pendingMatchCount: matches.length - completedMatchCount,
    divisionCount: divisions,
  };
}

export async function buildEventArchiveSnapshots(eventId: string): Promise<{
  eventSnapshot: EventArchiveEventSnapshot;
  applicantsSnapshot: EventArchiveApplicantsSnapshot;
  bracketSnapshot: EventArchiveBracketSnapshot;
  resultsSnapshot: EventArchiveResultsSnapshot;
}> {
  const [event, dbApplications, matchSlots, matchRows, resultRows] =
    await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        include: {
          organizer: { select: { name: true } },
        },
      }),
      prisma.eventApplication.findMany({
        where: { eventId },
        orderBy: [{ appliedAt: "asc" }, { createdAt: "asc" }],
        include: {
          fighter: {
            select: {
              id: true,
              name: true,
              gender: true,
              phone: true,
              birthDate: true,
              guardianPhone: true,
            },
          },
          gym: { select: { id: true, name: true } },
          division: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { depositorName: true },
          },
        },
      }),
      bracketRepository.listActiveMatchFighterSlotsForEvent(eventId),
      matchRepository.listMatchesByEvent(eventId),
      resultRepository.listResultsByEvent(eventId),
    ]);

  if (!event) {
    throw new Error("EVENT_NOT_FOUND");
  }

  const assignmentCounts = buildApplicantAssignmentCountMap(matchSlots);

  const applicantRows: ApplicantExcelExportRow[] = dbApplications.map((row) => {
    const snap =
      row.fighterSnapshot &&
      typeof row.fighterSnapshot === "object" &&
      !Array.isArray(row.fighterSnapshot)
        ? (row.fighterSnapshot as Record<string, unknown>)
        : {};
    const fighterName =
      typeof snap.name === "string" ? snap.name : row.fighter.name;
    const gymName = resolveApplicationGymDisplayName({
      gymNameSnapshot: row.gymNameSnapshot,
      gymSnapshot: row.gymSnapshot,
      gymRelationName: row.gym?.name,
    });
    const applicationWeightKg =
      typeof snap.applicationWeightKg === "number" &&
      Number.isFinite(snap.applicationWeightKg)
        ? snap.applicationWeightKg
        : null;
    const mapped = additionalInfoService.mapRowFields({
      additionalInfoStatus: row.additionalInfoStatus,
      additionalInfoCompletedAt: row.additionalInfoCompletedAt,
      additionalInfoRecipientPhone: row.additionalInfoRecipientPhone,
      additionalInfoRecipientMasked: row.additionalInfoRecipientMasked,
      divisionSelectionType: row.divisionSelectionType,
      fighter: {
        birthDate: row.fighter.birthDate,
        phone: row.fighter.phone,
        guardianPhone: row.fighter.guardianPhone,
      },
    });
    const assignmentCount = resolveApplicantAssignmentCount(
      assignmentCounts,
      row.fighter.id,
    );
    return {
      applicationId: row.id,
      gymName,
      fighterName,
      phone: row.fighter.phone,
      fighterGender: row.fighter.gender ?? "",
      birthDate: row.fighter.birthDate,
      division: row.division
        ? {
            sportType: row.division.sportType,
            ruleType: row.division.ruleType,
            gender: row.division.gender,
            ageGroup: row.division.ageGroup,
            weightClass: row.division.weightClass,
            weightClassName: row.division.weightClassName ?? null,
            weightLimitText: row.division.weightLimitText ?? null,
            skillLevel: row.division.skillLevel,
          }
        : null,
      divisionLabel: formatApplicationDivisionLabel({
        division: row.division,
        divisionSelectionType: row.divisionSelectionType,
        requestedDivisionText: row.requestedDivisionText,
      }),
      applicationWeightKg,
      recordText: row.recordText ?? null,
      careerText: row.careerText ?? null,
      paymentStatus: row.paymentStatus,
      applicationStatus: row.status,
      cancellationSource: row.cancellationSource ?? null,
      additionalInfoLabel: mapped.additionalInfoLabel,
      appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
      depositorName: row.payments[0]?.depositorName ?? null,
      memo: row.memo,
      isAssigned: assignmentCount >= 1,
    };
  });

  const approvedStatuses = new Set(["approved"]);
  const participantCount = applicantRows.filter((r) =>
    approvedStatuses.has(r.applicationStatus),
  ).length;

  const eventSnapshot: EventArchiveEventSnapshot = {
    eventId: event.id,
    title: event.title,
    eventDateLabel: formatUtcDateOnly(event.eventDate),
    locationLabel: formatEventLocation(event),
    organizerName: event.organizer.name,
    statusLabel: ORGANIZER_EVENT_STATUS_LABELS[event.status],
    registrationPeriodLabel: formatRegistrationPeriod(
      event.registrationStartDate,
      event.registrationEndDate,
    ),
    publicSlug: event.publicSlug,
  };

  const divisionLabels = new Set<string>();
  const bracketMatches: EventArchiveBracketMatchSnapshot[] = matchRows.map(
    (m) => {
      const division = m.bracket.division
        ? toEventDivisionDisplayInput(m.bracket.division)
        : null;
      const divisionLabel = division
        ? formatDivisionMainLabel(division)
        : null;
      if (divisionLabel) divisionLabels.add(divisionLabel);

      return {
        matchId: m.id,
        bracketId: m.bracketId,
        bracketTitle: m.bracket.title,
        matchNumber: m.matchNumber,
        globalMatchOrder: m.globalMatchOrder,
        matchOrder: m.matchOrder,
        round: m.round,
        roundName: m.roundName,
        divisionLabel,
        courtName: m.court?.name ?? null,
        matNumber: m.matNumber,
        red: cornerFromSnapshot(m.fighterRedSnapshot, m.fighterRed),
        blue: cornerFromSnapshot(m.fighterBlueSnapshot, m.fighterBlue),
        status: m.status,
        statusLabel: getBracketMatchStatusLabel(m.status as BracketMatchStatus),
        winnerId: m.winnerId,
        winnerName: m.winner?.name ?? null,
        loserId: m.loserId,
        loserName: m.loser?.name ?? null,
        resultType: m.resultType,
        resultTypeLabel: m.resultType
          ? outcomeStylePublicLabel(m.resultType)
          : null,
        resultMemo: m.resultMemo,
        organizerMemo: m.organizerMemo ?? null,
        matchWeightKg: m.matchWeightKg ?? null,
        nextMatchId: m.nextMatchId,
        nextMatchSlot: m.nextMatchSlot,
        hasOfficialResults: (m.matchResults?.length ?? 0) >= 2,
      };
    },
  );

  const results: EventArchiveResultRowSnapshot[] = resultRows
    .filter(
      (r) =>
        r.status === MatchRecordStatus.confirmed ||
        r.status === MatchRecordStatus.corrected,
    )
    .map((r) => {
      let divisionLabel: string | null = null;
      const div = r.divisionSnapshot;
      if (div && typeof div === "object") {
        const label = (div as Record<string, unknown>).label;
        divisionLabel =
          typeof label === "string" && label.trim() ? label : null;
      }
      const fighterSnap =
        r.fighterSnapshot && typeof r.fighterSnapshot === "object"
          ? (r.fighterSnapshot as Record<string, unknown>)
          : null;
      const opponentSnap =
        r.opponentSnapshot && typeof r.opponentSnapshot === "object"
          ? (r.opponentSnapshot as Record<string, unknown>)
          : null;

      return {
        resultId: r.id,
        matchId: r.matchId,
        matchNumber: r.match.matchNumber,
        bracketTitle: r.match.bracket.title,
        divisionLabel,
        fighterId: r.fighterId,
        fighterName:
          (typeof fighterSnap?.name === "string" ? fighterSnap.name : null) ??
          r.fighter.name,
        fighterGymName:
          typeof fighterSnap?.gymName === "string"
            ? fighterSnap.gymName
            : null,
        opponentId: r.opponentFighterId,
        opponentName:
          (typeof opponentSnap?.name === "string"
            ? opponentSnap.name
            : null) ?? r.opponentFighter?.name ?? null,
        opponentGymName:
          typeof opponentSnap?.gymName === "string"
            ? opponentSnap.gymName
            : null,
        result: r.result,
        resultLabel: outcomeKo(r.result),
        resultType: r.resultType,
        resultTypeLabel: r.resultType
          ? outcomeStylePublicLabel(r.resultType)
          : null,
        status: r.status,
        statusLabel: matchRecordStatusKo(r.status),
        matchDateLabel: r.matchDate
          ? formatUtcDateOnly(r.matchDate)
          : null,
      };
    });

  return {
    eventSnapshot,
    applicantsSnapshot: {
      rows: applicantRows,
      totalCount: applicantRows.length,
      participantCount,
    },
    bracketSnapshot: {
      matches: bracketMatches,
      divisionCount: divisionLabels.size,
      totalMatchCount: bracketMatches.length,
    },
    resultsSnapshot: {
      rows: results,
      totalCount: results.length,
    },
  };
}
