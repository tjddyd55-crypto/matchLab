import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { formatFighterBirthDateDisplay } from "@/lib/fighter/birth-date";
import { computeOfficialRecordFromResults } from "@/lib/fighter-unified-profile/official-record";
import {
  buildExternalRecordFromFighter,
  computeCombinedRecord,
} from "@/lib/fighter-unified-profile/record-utils";
import {
  matchOutcomeLabel,
  matchResultTypeLabel,
  summarizeEventMatchResults,
} from "@/lib/fighter-unified-profile/outcome-labels";
import type {
  FighterUnifiedAffiliationRow,
  FighterUnifiedEventHistoryRow,
  FighterUnifiedIdentity,
  FighterUnifiedProfileView,
  FighterUnifiedRecentMatch,
  UnifiedProfileViewerRole,
} from "@/lib/fighter-unified-profile/types";
import type { MatchRecordOutcome } from "@/lib/enums";
import type { MatchResultDivisionSnapshotJson } from "@/lib/match-result-snapshot";
import { requireRole } from "@/lib/permissions";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { resultRepository } from "@/lib/repositories/result.repository";
import { fighterService } from "@/lib/services/fighter.service";
import { memberGymService } from "@/lib/services/member-gym.service";
import { prisma } from "@/lib/prisma";

function parseApplicationFighterSnapshot(raw: unknown): {
  name?: string;
  gymName?: string;
} {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === "string" ? o.name : undefined,
    gymName: typeof o.gymName === "string" ? o.gymName : undefined,
  };
}

function parseDivisionSnapshotLabel(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const label = (raw as MatchResultDivisionSnapshotJson).label;
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function assertAdmin(actor: ActorContext) {
  requireRole(actor, ["admin"]);
}

async function assertAssociationAccess(
  actor: ActorContext,
  fighterId: string,
  memberGymId: string,
): Promise<void> {
  requireRole(actor, ["organizer", "admin"]);
  const member = await memberGymService.getMemberGym(actor, memberGymId);
  const fighter = await prisma.fighter.findFirst({
    where: { id: fighterId, currentGymId: member.gymId },
    select: { id: true },
  });
  if (!fighter) {
    throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
  }
}

async function loadFighterBase(fighterId: string) {
  return prisma.fighter.findUnique({
    where: { id: fighterId },
    select: {
      id: true,
      fighterCode: true,
      name: true,
      gender: true,
      birthDate: true,
      phone: true,
      status: true,
      primarySport: true,
      weight: true,
      currentGymId: true,
      externalRecordWin: true,
      externalRecordLoss: true,
      externalRecordDraw: true,
      externalRecordNoContest: true,
      currentGym: { select: { id: true, name: true } },
      fighterProfile: {
        select: { slug: true, isPublic: true },
      },
    },
  });
}

function buildIdentity(
  row: NonNullable<Awaited<ReturnType<typeof loadFighterBase>>>,
  viewerRole: UnifiedProfileViewerRole,
): FighterUnifiedIdentity {
  const slug = row.fighterProfile?.slug ?? "";
  const isPublic = row.fighterProfile?.isPublic ?? false;
  const showContact = viewerRole === "gym" || viewerRole === "admin";

  return {
    fighterId: row.id,
    fighterCode: row.fighterCode,
    name: row.name,
    gender: row.gender,
    birthDate:
      viewerRole === "public"
        ? null
        : row.birthDate
          ? formatFighterBirthDateDisplay(row.birthDate)
          : null,
    phone: showContact ? row.phone : null,
    status: row.status,
    primarySport: row.primarySport,
    weightKg: row.weight,
    currentGym: row.currentGym
      ? { id: row.currentGym.id, name: row.currentGym.name }
      : null,
    publicProfile: {
      slug,
      isPublic,
      href: isPublic && slug ? `/fighters/${slug}` : null,
    },
  };
}

function mapRecentMatches(
  rows: Awaited<ReturnType<typeof resultRepository.listResultsByFighter>>,
): FighterUnifiedRecentMatch[] {
  return rows.map((r) => {
    const divisionLabel =
      parseDivisionSnapshotLabel(r.divisionSnapshot) ??
      (r.match.bracket.title?.trim() || null);
    const divisionJson = r.divisionSnapshot as MatchResultDivisionSnapshotJson | null;
    return {
      matchResultId: r.id,
      matchId: r.matchId,
      eventId: r.eventId,
      eventTitle: r.eventTitleSnapshot ?? r.event.title,
      eventDateIso: r.matchDate.toISOString(),
      opponentName: r.opponentFighter?.name ?? null,
      opponentGymName: r.opponentFighter?.currentGym?.name ?? null,
      divisionLabel,
      weightClass: divisionJson?.weightClass ?? null,
      result: r.result,
      resultLabel: matchOutcomeLabel(r.result),
      resultTypeLabel: matchResultTypeLabel(r.resultType),
      matchNumber: r.match.matchNumber,
      matNumber: r.match.matNumber,
      status: r.status,
    };
  });
}

function buildEventHistory(
  applications: Awaited<
    ReturnType<typeof applicationRepository.listApplicationsForFighter>
  >,
  resultsByEvent: Map<string, { result: MatchRecordOutcome }[]>,
): FighterUnifiedEventHistoryRow[] {
  return applications.map((app) => {
    const snapshot = parseApplicationFighterSnapshot(app.fighterSnapshot);
    const divisionLabel = app.division
      ? formatDivisionNameLabel(app.division)
      : app.requestedDivisionText?.trim() || "—";
    const eventResults = resultsByEvent.get(app.event.id) ?? [];
    return {
      applicationId: app.id,
      eventId: app.event.id,
      eventTitle: app.event.title,
      eventDateIso: app.event.registrationEndDate?.toISOString() ?? null,
      divisionLabel,
      applicationStatus: app.status,
      fighterNameSnapshot: snapshot.name ?? null,
      gymNameSnapshot: snapshot.gymName ?? null,
      hadOfficialMatch: eventResults.length > 0,
      resultSummary: summarizeEventMatchResults(eventResults),
    };
  });
}

async function loadAffiliationHistory(
  fighterId: string,
  currentGymId: string | null,
): Promise<FighterUnifiedAffiliationRow[]> {
  const rows = await prisma.fighterGymHistory.findMany({
    where: { fighterId },
    orderBy: { startDate: "desc" },
    include: { gym: { select: { id: true, name: true } } },
  });
  return rows.map((h) => ({
    id: h.id,
    gymId: h.gymId,
    gymName: h.gym.name,
    startDateIso: h.startDate.toISOString(),
    endDateIso: h.endDate?.toISOString() ?? null,
    status: h.status,
    isCurrent: currentGymId != null && h.gymId === currentGymId && !h.endDate,
  }));
}

async function buildProfileView(
  fighterId: string,
  viewerRole: UnifiedProfileViewerRole,
): Promise<FighterUnifiedProfileView | null> {
  const base = await loadFighterBase(fighterId);
  if (!base) return null;

  const [matchRows, applications] = await Promise.all([
    resultRepository.listResultsByFighter(fighterId),
    applicationRepository.listApplicationsForFighter(fighterId),
  ]);

  const officialRecord = computeOfficialRecordFromResults(matchRows);
  const externalRecord = buildExternalRecordFromFighter(base);
  const combinedRecord = computeCombinedRecord(officialRecord, externalRecord);
  const resultsByEvent = new Map<string, { result: MatchRecordOutcome }[]>();
  for (const r of matchRows) {
    const list = resultsByEvent.get(r.eventId) ?? [];
    list.push({ result: r.result });
    resultsByEvent.set(r.eventId, list);
  }

  const affiliationHistory = await loadAffiliationHistory(
    fighterId,
    base.currentGymId,
  );

  return {
    identity: buildIdentity(base, viewerRole),
    officialRecord,
    externalRecord,
    combinedRecord,
    recentMatches: mapRecentMatches(matchRows),
    eventHistory: buildEventHistory(applications, resultsByEvent),
    affiliationHistory,
  };
}

export const fighterUnifiedProfileService = {
  async loadForGym(
    actor: ActorContext,
    fighterId: string,
  ): Promise<FighterUnifiedProfileView> {
    await fighterService.getGymFighterForEdit(actor, fighterId);
    const view = await buildProfileView(fighterId, "gym");
    if (!view) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    return view;
  },

  async loadForAssociation(
    actor: ActorContext,
    fighterId: string,
    memberGymId: string,
  ): Promise<FighterUnifiedProfileView> {
    await assertAssociationAccess(actor, fighterId, memberGymId);
    const view = await buildProfileView(fighterId, "association");
    if (!view) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    return view;
  },

  async loadForAdmin(
    actor: ActorContext,
    fighterId: string,
  ): Promise<FighterUnifiedProfileView> {
    assertAdmin(actor);
    const view = await buildProfileView(fighterId, "admin");
    if (!view) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    return view;
  },

  async loadForFighter(
    actor: ActorContext,
    fighterId?: string,
  ): Promise<FighterUnifiedProfileView> {
    requireRole(actor, ["fighter"]);
    const id = fighterId ?? actor.fighterId;
    if (!id || actor.fighterId !== id) {
      throw new AppError("FORBIDDEN", "본인 전적만 확인할 수 있습니다.");
    }
    const view = await buildProfileView(id, "fighter");
    if (!view) throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    return view;
  },

  async loadOfficialRecord(fighterId: string) {
    const rows = await resultRepository.listResultsByFighter(fighterId);
    return computeOfficialRecordFromResults(rows);
  },

  async loadCareerBreakdown(fighterId: string) {
    const [matchRows, fighter] = await Promise.all([
      resultRepository.listResultsByFighter(fighterId),
      prisma.fighter.findUnique({
        where: { id: fighterId },
        select: {
          externalRecordWin: true,
          externalRecordLoss: true,
          externalRecordDraw: true,
          externalRecordNoContest: true,
        },
      }),
    ]);
    const officialRecord = computeOfficialRecordFromResults(matchRows);
    const externalRecord = buildExternalRecordFromFighter(
      fighter ?? {
        externalRecordWin: 0,
        externalRecordLoss: 0,
        externalRecordDraw: 0,
        externalRecordNoContest: 0,
      },
    );
    return {
      officialRecord,
      externalRecord,
      combinedRecord: computeCombinedRecord(officialRecord, externalRecord),
    };
  },
};
