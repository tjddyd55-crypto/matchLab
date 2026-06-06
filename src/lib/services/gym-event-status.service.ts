import "server-only";

import type {
  ApplicationDocumentStatus,
  ApplicationStatus,
  BracketMatchStatus,
  PaymentStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import {
  readCustomFormFromAgreementSnapshot,
  resolveApplicationFormMode,
  type ApplicationFormMode,
  type CustomFormSnapshot,
} from "@/lib/application-form/custom-form";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { AppError } from "@/lib/errors/app-error";
import {
  computeFieldEligibility,
  getCheckInStatusLabel,
  getWeighInStatusLabel,
} from "@/lib/field-eligibility";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { requireGymOwner, requireRole } from "@/lib/permissions";
import { applicationDocumentRepository } from "@/lib/repositories/application-document.repository";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import { notificationRepository } from "@/lib/repositories/notification.repository";

export type GymApplicationFormStatusKey =
  | "none"
  | "pdf_document"
  | "custom_form"
  | "needs_completion";

export type GymEventApplicationStatusRowDTO = {
  applicationId: string;
  fighterId: string;
  fighterName: string;
  divisionId: string;
  divisionLabel: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  applicationFormStatusKey: GymApplicationFormStatusKey;
  applicationFormStatusLabel: string;
  checkInStatus: import("@/generated/prisma").CheckInStatus;
  checkInStatusLabel: string;
  weighInStatus: import("@/generated/prisma").WeighInStatus;
  weighInStatusLabel: string;
  isEligibleForBracket: boolean;
  eligibilityLabel: string;
  eligibilityReason: string;
  bracketAssigned: boolean;
  bracketGenerated: boolean;
  matchId: string | null;
  matchNumber: number | null;
  globalMatchOrder: number | null;
  opponentName: string | null;
  opponentGymName: string | null;
  matchStatus: BracketMatchStatus | null;
  matchStatusLabel: string | null;
  resultSummary: string | null;
  matchSummary: string | null;
  memo: string | null;
  customFormSnapshot: CustomFormSnapshot | null;
  applicationDocumentStatus: ApplicationDocumentStatus | null;
};

export type GymEventApplicationStatusSummaryDTO = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  fieldPending: number;
  weighPass: number;
  eligible: number;
  bracketAssigned: number;
};

export type GymEventMatchRowDTO = {
  matchId: string;
  fighterId: string;
  fighterName: string;
  opponentName: string | null;
  opponentGymName: string | null;
  divisionLabel: string;
  bracketTitle: string;
  matchNumber: number | null;
  globalMatchOrder: number | null;
  matchStatus: BracketMatchStatus;
  matchStatusLabel: string;
  resultSummary: string | null;
  publicSlug: string;
};

export type GymEventStatusPageDTO = {
  eventId: string;
  eventTitle: string;
  publicSlug: string;
  bracketGenerated: boolean;
  applicationFormMode: ApplicationFormMode;
  rows: GymEventApplicationStatusRowDTO[];
  summary: GymEventApplicationStatusSummaryDTO;
  matches: GymEventMatchRowDTO[];
  unassignedFighters: { fighterId: string; fighterName: string; divisionLabel: string }[];
};

function readSnapshotName(snapshot: unknown): string {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    "name" in snapshot &&
    typeof (snapshot as { name: unknown }).name === "string"
  ) {
    return (snapshot as { name: string }).name;
  }
  return "—";
}

function formatDivisionLabel(d: {
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
}): string {
  return [
    d.sportType,
    d.ruleType,
    d.weightClass ?? d.ageGroup,
    d.gender,
    d.skillLevel,
  ]
    .filter((x): x is string => Boolean(x?.trim()))
    .join(" · ");
}

function bracketMatchStatusLabel(status: BracketMatchStatus): string {
  switch (status) {
    case "waiting":
      return "대기";
    case "called":
      return "호명";
    case "ongoing":
      return "진행 중";
    case "finished":
      return "종료";
    case "delayed":
      return "지연";
    case "cancelled":
      return "취소";
    default:
      return String(status);
  }
}

function resolveApplicationFormStatus(
  eventFormMode: ApplicationFormMode,
  customFormSnapshot: CustomFormSnapshot | null,
  applicationDocumentStatus: ApplicationDocumentStatus | null,
): { key: GymApplicationFormStatusKey; label: string } {
  if (eventFormMode === "none") {
    return { key: "none", label: "없음" };
  }
  if (eventFormMode === "custom") {
    if (customFormSnapshot && customFormSnapshot.answers.length > 0) {
      return { key: "custom_form", label: "자체 폼 답변" };
    }
    return { key: "needs_completion", label: "작성 필요" };
  }
  if (applicationDocumentStatus === "completed" || applicationDocumentStatus === "submitted") {
    return { key: "pdf_document", label: "PDF 문서" };
  }
  if (applicationDocumentStatus) {
    return { key: "needs_completion", label: "작성 필요" };
  }
  return { key: "needs_completion", label: "작성 필요" };
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
    const label = outcomeStylePublicLabel(match.resultType);
    return label ?? "종료";
  }
  if (match.status === "finished") return "종료";
  return null;
}

type EventMatchRow = Awaited<
  ReturnType<typeof matchRepository.findMatchesForGymInEvent>
>[number];

function mapGymPerspectiveMatch(
  gymId: string,
  m: EventMatchRow,
): { fighterId: string; fighterName: string; opponentName: string | null; opponentGymName: string | null } | null {
  const redHere = m.fighterRed?.currentGymId === gymId;
  const blueHere = m.fighterBlue?.currentGymId === gymId;
  if (redHere && m.fighterRed) {
    return {
      fighterId: m.fighterRed.id,
      fighterName: m.fighterRed.name,
      opponentName: m.fighterBlue?.name ?? null,
      opponentGymName: m.fighterBlue?.currentGym?.name ?? null,
    };
  }
  if (blueHere && m.fighterBlue) {
    return {
      fighterId: m.fighterBlue.id,
      fighterName: m.fighterBlue.name,
      opponentName: m.fighterRed?.name ?? null,
      opponentGymName: m.fighterRed?.currentGym?.name ?? null,
    };
  }
  return null;
}

export function buildApplicationStatusSummary(
  rows: GymEventApplicationStatusRowDTO[],
): GymEventApplicationStatusSummaryDTO {
  return {
    total: rows.length,
    approved: rows.filter((r) => r.applicationStatus === "approved").length,
    pending: rows.filter((r) => r.applicationStatus === "pending").length,
    rejected: rows.filter((r) => r.applicationStatus === "rejected").length,
    fieldPending: rows.filter(
      (r) => r.applicationStatus === "approved" && r.checkInStatus === "pending",
    ).length,
    weighPass: rows.filter(
      (r) => r.weighInStatus === "pass" || r.weighInStatus === "manual_pass",
    ).length,
    eligible: rows.filter((r) => r.isEligibleForBracket).length,
    bracketAssigned: rows.filter((r) => r.bracketAssigned).length,
  };
}

export const gymEventStatusService = {
  async listGymEventApplicationStatuses(
    actor: ActorContext,
    eventId: string,
  ): Promise<GymEventApplicationStatusRowDTO[]> {
    const page = await gymEventStatusService.getGymEventStatusPage(actor, eventId);
    return page.rows;
  },

  async listGymEventMatches(
    actor: ActorContext,
    eventId: string,
  ): Promise<GymEventMatchRowDTO[]> {
    const page = await gymEventStatusService.getGymEventStatusPage(actor, eventId);
    return page.matches;
  },

  async getGymEventStatusPage(
    actor: ActorContext,
    eventId: string,
  ): Promise<GymEventStatusPageDTO> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) {
      throw new AppError(
        "FORBIDDEN",
        "체육관 정보가 없습니다. 체육관 계정으로 이용해 주세요.",
      );
    }
    await requireGymOwner(actor, gymId);

    const event = await eventRepository.findEventWithDivisionsForApplication(eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }

    const applicationFormMode = resolveApplicationFormMode(
      event.applicationFormTemplate
        ? {
            templateId: event.applicationFormTemplateId,
            fieldsJson: event.applicationFormTemplate.fieldsJson,
            manualFieldsJson: event.applicationFormTemplate.manualFieldsJson,
          }
        : null,
    );

    const [applications, documents, brackets, matches, placedFighterIds, slugRow] =
      await Promise.all([
        applicationRepository.listGymEventApplications(gymId, eventId),
        applicationDocumentRepository.listForGymEvent(gymId, eventId),
        bracketRepository.listBracketsByEvent(eventId),
        matchRepository.findMatchesForGymInEvent(gymId, eventId),
        bracketRepository.listPlacedFighterIdsForEvent(eventId),
        notificationRepository.getEventSlugTitle(eventId),
      ]);

    const bracketGenerated = brackets.length > 0;
    const placedSet = new Set(placedFighterIds);
    const docByFighter = new Map(documents.map((d) => [d.fighterId, d]));

    const matchByFighter = new Map<
      string,
      EventMatchRow & {
        perspective: NonNullable<ReturnType<typeof mapGymPerspectiveMatch>>;
      }
    >();

    for (const m of matches) {
      const perspective = mapGymPerspectiveMatch(gymId, m);
      if (!perspective) continue;
      const existing = matchByFighter.get(perspective.fighterId);
      if (!existing) {
        matchByFighter.set(perspective.fighterId, { ...m, perspective });
        continue;
      }
      const curOrder = existing.globalMatchOrder ?? existing.matchOrder;
      const nextOrder = m.globalMatchOrder ?? m.matchOrder;
      if (nextOrder < curOrder) {
        matchByFighter.set(perspective.fighterId, { ...m, perspective });
      }
    }

    const rows: GymEventApplicationStatusRowDTO[] = applications.map((row) => {
      const fighterName = row.fighter.name || readSnapshotName(row.fighterSnapshot);
      const divisionLabel = formatDivisionLabel(row.division);
      const eligibility = computeFieldEligibility({
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
      });
      const customFormSnapshot = readCustomFormFromAgreementSnapshot(
        row.applicationAgreementSnapshot,
      );
      const doc = docByFighter.get(row.fighterId);
      const formStatus = resolveApplicationFormStatus(
        applicationFormMode,
        customFormSnapshot,
        doc?.status ?? null,
      );
      const bracketAssigned = placedSet.has(row.fighterId);
      const matchEntry = matchByFighter.get(row.fighterId);
      const perspective = matchEntry?.perspective;

      let matchSummary: string | null = null;
      if (matchEntry && perspective) {
        if (perspective.opponentName) {
          matchSummary = `vs ${perspective.opponentName}`;
        } else if (matchEntry.matchNumber != null) {
          matchSummary = `경기 #${matchEntry.matchNumber}`;
        } else {
          matchSummary = "대진 배정";
        }
      } else if (row.status === "approved" && bracketGenerated) {
        matchSummary = "미배정";
      }

      const resultSummary = matchEntry
        ? buildMatchResultSummary(row.fighterId, {
            status: matchEntry.status,
            winnerId: matchEntry.winnerId,
            loserId: matchEntry.loserId,
            resultType: matchEntry.resultType,
            matchResults: matchEntry.matchResults ?? [],
          })
        : null;

      return {
        applicationId: row.id,
        fighterId: row.fighterId,
        fighterName,
        divisionId: row.divisionId,
        divisionLabel,
        applicationStatus: row.status,
        paymentStatus: row.paymentStatus,
        applicationFormStatusKey: formStatus.key,
        applicationFormStatusLabel: formStatus.label,
        checkInStatus: row.checkInStatus,
        checkInStatusLabel: getCheckInStatusLabel(row.checkInStatus),
        weighInStatus: row.weighInStatus,
        weighInStatusLabel: getWeighInStatusLabel(row.weighInStatus),
        isEligibleForBracket: eligibility.isEligibleForBracket,
        eligibilityLabel: eligibility.eligibilityLabel,
        eligibilityReason: eligibility.eligibilityReason,
        bracketAssigned,
        bracketGenerated,
        matchId: matchEntry?.id ?? null,
        matchNumber: matchEntry?.matchNumber ?? null,
        globalMatchOrder: matchEntry?.globalMatchOrder ?? null,
        opponentName: perspective?.opponentName ?? null,
        opponentGymName: perspective?.opponentGymName ?? null,
        matchStatus: matchEntry?.status ?? null,
        matchStatusLabel: matchEntry
          ? bracketMatchStatusLabel(matchEntry.status)
          : null,
        resultSummary,
        matchSummary,
        memo: row.memo,
        customFormSnapshot,
        applicationDocumentStatus: doc?.status ?? null,
      };
    });

    const matchRows: GymEventMatchRowDTO[] = matches.flatMap((m) => {
      const perspective = mapGymPerspectiveMatch(gymId, m);
      if (!perspective) return [];
      const divisionLabel = m.bracket.division
        ? formatDivisionNameLabel(m.bracket.division)
        : m.bracket.title;
      return [
        {
          matchId: m.id,
          fighterId: perspective.fighterId,
          fighterName: perspective.fighterName,
          opponentName: perspective.opponentName,
          opponentGymName: perspective.opponentGymName,
          divisionLabel,
          bracketTitle: m.bracket.title,
          matchNumber: m.matchNumber,
          globalMatchOrder: m.globalMatchOrder,
          matchStatus: m.status,
          matchStatusLabel: bracketMatchStatusLabel(m.status),
          resultSummary: buildMatchResultSummary(perspective.fighterId, {
            status: m.status,
            winnerId: m.winnerId,
            loserId: m.loserId,
            resultType: m.resultType,
            matchResults: m.matchResults ?? [],
          }),
          publicSlug: m.bracket.event.publicSlug,
        },
      ];
    });

    const unassignedFighters = rows
      .filter(
        (r) =>
          r.applicationStatus === "approved" &&
          r.bracketGenerated &&
          !r.bracketAssigned,
      )
      .map((r) => ({
        fighterId: r.fighterId,
        fighterName: r.fighterName,
        divisionLabel: r.divisionLabel,
      }));

    return {
      eventId,
      eventTitle: event.title,
      publicSlug: slugRow?.publicSlug ?? matches[0]?.bracket.event.publicSlug ?? "",
      bracketGenerated,
      applicationFormMode,
      rows,
      summary: buildApplicationStatusSummary(rows),
      matches: matchRows,
      unassignedFighters,
    };
  },
};
