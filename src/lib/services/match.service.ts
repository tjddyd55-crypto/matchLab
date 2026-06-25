import "server-only";

import {
  BracketChangeType,
  BracketType,
  Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import {
  toEventDivisionDisplayInput,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";
import type { FighterHandicapDisplay } from "@/lib/fighter-handicap-display";
import {
  buildFighterHandicapMap,
} from "@/lib/fighter-handicap-display";
import { sortMatchesByCourtSchedule } from "@/lib/court-match-order";
import { AppError } from "@/lib/errors/app-error";
import { assertBracketMatchStatusTransition } from "@/lib/match-status-transition";
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";
import { mergeDisplayResultMemo, updateMatchBoutInResultMemo } from "@/lib/match-result-memo";
import {
  encodeMatchOperationalSettings,
  parseMatchOperationalSettings,
  type MatchOperationalSettings,
} from "@/lib/match-operational-settings";
import {
  requireGymOwner,
  requireOrganizerForEvent,
  requireRole,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { eventCourtRepository } from "@/lib/repositories/event-court.repository";
import {
  bracketRepository,
} from "@/lib/repositories/bracket.repository";
import {
  matchRepository,
  type MatchOwnershipContext,
} from "@/lib/repositories/match.repository";
import { notificationRepository } from "@/lib/repositories/notification.repository";
import { tryNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";
import type { ResolvedStaffRecorderLink } from "@/lib/services/event-staff-access.service";
import {
  toStaffEventMatchRow,
  type StaffEventMatchListItemVM,
} from "@/lib/staff-match-display";
import { MatchRecordStatus } from "@/lib/enums";
import type {
  CancelMatchInput,
  RecordMatchOutcomeDraftInput,
  UpdateMatchStatusInput,
} from "@/lib/validators/match.validator";

function changelogReason(
  changeType: BracketChangeType,
  explicit?: string | null,
): string {
  if (explicit?.trim()) return explicit.trim();
  switch (changeType) {
    case BracketChangeType.match_status_changed:
      return "경기 상태가 변경되었습니다.";
    case BracketChangeType.winner_changed:
      return "승자 정보가 변경되었습니다.";
    case BracketChangeType.result_type_changed:
      return "경기 결방식이 변경되었습니다.";
    case BracketChangeType.match_cancelled:
      return "경기가 취소되었습니다.";
    default:
      return "대진표 매치가 변경되었습니다.";
  }
}

async function appendBracketChangeLog(
  tx: Prisma.TransactionClient,
  params: {
    eventId: string;
    bracketId: string;
    matchId?: string | null;
    changedByUserId?: string | null;
    changedByStaffLinkId?: string | null;
    bracketType: BracketType;
    changeType: BracketChangeType;
    beforeData?: Prisma.InputJsonValue | null;
    afterData?: Prisma.InputJsonValue | null;
    reason?: string | null;
  },
): Promise<void> {
  await bracketRepository.createBracketChangeLog(
    {
      eventId: params.eventId,
      bracketId: params.bracketId,
      matchId: params.matchId ?? null,
      changedByUserId: params.changedByUserId ?? null,
      changedByStaffLinkId: params.changedByStaffLinkId ?? null,
      bracketType: params.bracketType,
      changeType: params.changeType,
      beforeData: params.beforeData ?? null,
      afterData: params.afterData ?? null,
      reason: changelogReason(params.changeType, params.reason),
    },
    tx,
  );
}

async function loadMatchBracketCtx(
  matchId: string,
): Promise<
  MatchOwnershipContext & {
    bracketType: BracketType;
  }
> {
  const own = await matchRepository.findMatchOwnershipContext(matchId);
  if (!own) {
    throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
  }

  const bracketRow = await prisma.bracket.findUnique({
    where: { id: own.bracketId },
    select: { type: true },
  });
  if (!bracketRow) {
    throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");
  }

  return { ...own, bracketType: bracketRow.type };
}

async function ensureMatchOrganizer(
  actor: ActorContext,
  matchId: string,
): Promise<
  MatchOwnershipContext & {
    bracketType: BracketType;
  }
> {
  requireRole(actor, ["organizer", "admin"]);
  const ctx = await loadMatchBracketCtx(matchId);
  await requireOrganizerForEvent(actor, ctx.eventId);

  return ctx;
}

function staffAugmentedReason(
  staffLabel: string,
  explicit?: string | null,
): string | null {
  const prefix = `결과입력자(${staffLabel})`;
  const tail = explicit?.trim();
  return tail ? `${prefix}: ${tail}` : prefix;
}

async function ensureStaffRecorderMatch(
  link: ResolvedStaffRecorderLink,
  matchId: string,
): Promise<
  MatchOwnershipContext & {
    bracketType: BracketType;
  }
> {
  const ctx = await loadMatchBracketCtx(matchId);
  if (ctx.eventId !== link.eventId) {
    throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
  }
  return ctx;
}

async function notifyMatchStakeholdersAfterChange(
  tx: Prisma.TransactionClient,
  ctx: MatchOwnershipContext & { bracketType: BracketType },
  matchId: string,
  summaryLine: string,
): Promise<void> {
  const slugRow = await notificationRepository.getEventSlugTitle(
    ctx.eventId,
    tx,
  );
  const bracketTitleRow = await tx.bracket.findUnique({
    where: { id: ctx.bracketId },
    select: { title: true },
  });
  if (!slugRow?.publicSlug || !bracketTitleRow?.title) return;
  await tryNotify(`match-changed:${matchId}`, () =>
    notificationService.notifyMatchChanged(
      {
        eventId: ctx.eventId,
        publicSlug: slugRow.publicSlug,
        bracketTitle: bracketTitleRow.title,
        matchId,
        summaryLine,
      },
      tx,
    ),
  );
}

type UpcomingMatchRow = Awaited<
  ReturnType<typeof matchRepository.findUpcomingMatchesForFighter>
>[number];

export type FieldModeMatchCardVM = {
  matchId: string;
  eventId: string;
  eventTitle: string;
  publicSlug: string;
  bracketTitle: string;
  roundName: string | null;
  matchOrder: number;
  globalMatchOrder: number | null;
  matchNumber: number | null;
  matNumber: number | null;
  status: import("@/lib/enums").BracketMatchStatus;
  hasOfficialResults: boolean;
  selfCorner: "red" | "blue" | null;
  opponentName: string | null;
  opponentGymName: string | null;
  gymFighterName: string | null;
};

function mapFieldModeRow(
  m: UpcomingMatchRow,
  perspective: { fighterId?: string; gymId?: string },
): FieldModeMatchCardVM {
  const official = m.matchResults ?? [];
  const hasOfficialResults = official.length >= 2;

  let selfCorner: "red" | "blue" | null = null;
  let opponentName: string | null = null;
  let opponentGymName: string | null = null;
  let gymFighterName: string | null = null;

  if (perspective.gymId) {
    const gymId = perspective.gymId;
    const redHere = m.fighterRed?.currentGymId === gymId;
    const blueHere = m.fighterBlue?.currentGymId === gymId;
    if (redHere && m.fighterRed) {
      gymFighterName = m.fighterRed.name;
      opponentName = m.fighterBlue?.name ?? null;
      opponentGymName = m.fighterBlue?.currentGym?.name ?? null;
    } else if (blueHere && m.fighterBlue) {
      gymFighterName = m.fighterBlue.name;
      opponentName = m.fighterRed?.name ?? null;
      opponentGymName = m.fighterRed?.currentGym?.name ?? null;
    }
  } else if (perspective.fighterId) {
    const fid = perspective.fighterId;
    if (m.fighterRedId === fid) {
      selfCorner = "red";
      opponentName = m.fighterBlue?.name ?? null;
      opponentGymName = m.fighterBlue?.currentGym?.name ?? null;
    } else if (m.fighterBlueId === fid) {
      selfCorner = "blue";
      opponentName = m.fighterRed?.name ?? null;
      opponentGymName = m.fighterRed?.currentGym?.name ?? null;
    }
  }

  return {
    matchId: m.id,
    eventId: m.bracket.event.id,
    eventTitle: m.bracket.event.title,
    publicSlug: m.bracket.event.publicSlug,
    bracketTitle: m.bracket.title,
    roundName: m.roundName,
    matchOrder: m.matchOrder,
    globalMatchOrder: m.globalMatchOrder,
    matchNumber: m.matchNumber,
    matNumber: m.matNumber,
    status: m.status,
    hasOfficialResults,
    selfCorner,
    opponentName,
    opponentGymName,
    gymFighterName,
  };
}

export type OrganizerEventMatchFighterVM = {
  id: string;
  fighterCode: string;
  name: string;
  gymName: string | null;
  handicap: FighterHandicapDisplay | null;
};

export type OrganizerEventMatchListItemVM = {
  eventTitle: string;
  matchId: string;
  bracketId: string;
  bracketTitle: string;
  bracketType: BracketType;
  bracketIsPublic: boolean;
  matchIsPublicSparring: boolean;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string | null;
  roundName: string | null;
  matchOrder: number;
  globalMatchOrder: number | null;
  matchNumber: number | null;
  matNumber: number | null;
  courtId: string | null;
  courtName: string | null;
  courtOrder: number | null;
  status: import("@/lib/enums").BracketMatchStatus;
  fighterRed: OrganizerEventMatchFighterVM | null;
  fighterBlue: OrganizerEventMatchFighterVM | null;
  winnerId: string | null;
  loserId: string | null;
  resultType: import("@/lib/enums").BracketMatchOutcomeStyle | null;
  resultMemo: string | null;
  /** 운영상 종료 (`BracketMatch.finished`) */
  isFinishedOps: boolean;
  /** 공식 전적 반영 (`MatchResult` 확정·정정 행 존재) */
  hasOfficialResults: boolean;
};

export const matchService = {
  async listOrganizerEventMatches(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerEventMatchListItemVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const [rows, handicapRows, courts] = await Promise.all([
      matchRepository.listMatchesByEvent(eventId),
      applicationRepository.listFighterHandicapFieldsForEvent(eventId),
      eventCourtRepository.listAllByEvent(eventId),
    ]);
    const handicapMap = buildFighterHandicapMap(handicapRows);

    function mapFighter(
      f: NonNullable<(typeof rows)[number]["fighterRed"]>,
    ): OrganizerEventMatchFighterVM {
      const h = handicapMap.get(f.id);
      return {
        id: f.id,
        fighterCode: f.fighterCode,
        name: f.name,
        gymName: f.currentGym?.name ?? null,
        handicap:
          h?.badgeLabel != null
            ? { badgeLabel: h.badgeLabel, note: h.note }
            : null,
      };
    }

    const mapped = rows.map((m): OrganizerEventMatchListItemVM => {
      const division = toEventDivisionDisplayInput(m.bracket.division);
      const divisionLabel = division
        ? formatDivisionNameLabel(division)
        : null;

      const results = m.matchResults ?? [];
      const official = results.filter(
        (r) =>
          r.status === MatchRecordStatus.confirmed ||
          r.status === MatchRecordStatus.corrected,
      );
      const hasOfficialResults = official.length >= 2;

      return {
        eventTitle: m.bracket.event?.title ?? "",
        matchId: m.id,
        bracketId: m.bracketId,
        bracketTitle: m.bracket.title,
        bracketType: m.bracket.type,
        bracketIsPublic: m.bracket.isPublic,
        matchIsPublicSparring: resolveMatchIsPublicSparring({
          bracketType: m.bracket.type,
          bracketIsPublic: m.bracket.isPublic,
          resultMemo: m.resultMemo,
        }),
        division,
        divisionLabel,
        roundName: m.roundName,
        matchOrder: m.matchOrder,
        globalMatchOrder: m.globalMatchOrder,
        matchNumber: m.matchNumber,
        matNumber: m.matNumber,
        courtId: m.courtId ?? null,
        courtName: m.court?.name ?? null,
        courtOrder: m.courtOrder ?? null,
        status: m.status,
        fighterRed: m.fighterRed ? mapFighter(m.fighterRed) : null,
        fighterBlue: m.fighterBlue ? mapFighter(m.fighterBlue) : null,
        winnerId: m.winnerId,
        loserId: m.loserId,
        resultType: m.resultType,
        resultMemo: m.resultMemo ?? null,
        isFinishedOps: m.status === "finished",
        hasOfficialResults,
      };
    });

    return sortMatchesByCourtSchedule(
      mapped.map((m) => ({ ...m, matchId: m.matchId })),
      courts.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
    );
  },

  async updateMatchStatus(
    actor: ActorContext,
    input: UpdateMatchStatusInput,
  ): Promise<void> {
    const ctx = await ensureMatchOrganizer(actor, input.matchId);

    await prisma.$transaction(async (tx) => {
      const cur = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { status: true },
      });
      if (!cur) {
        throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
      }

      assertBracketMatchStatusTransition(cur.status, input.status);

      await matchRepository.updateMatchStatus(input.matchId, input.status, tx);

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.match_status_changed,
        beforeData: { status: cur.status },
        afterData: { status: input.status },
        reason: input.reason ?? null,
      });

      await notifyMatchStakeholdersAfterChange(
        tx,
        ctx,
        input.matchId,
        "경기 상태가 변경되었습니다.",
      );
    });
  },

  async recordMatchOutcomeDraft(
    actor: ActorContext,
    input: RecordMatchOutcomeDraftInput,
  ): Promise<void> {
    const ctx = await ensureMatchOrganizer(actor, input.matchId);

    const row = await matchRepository.findMatchWithBracketContext(input.matchId);
    if (!row) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    if (row.status === "cancelled") {
      throw new AppError("CONFLICT", "취소된 경기에는 결과를 입력할 수 없습니다.");
    }
    const redId = row.fighterRedId;
    const blueId = row.fighterBlueId;
    if (!redId || !blueId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "레드·블루 선수가 모두 배치된 경기만 결과를 입력할 수 있습니다.",
      );
    }

    let winnerId: string | null = null;
    let loserId: string | null = null;

    if (input.outcomeMode === "win_loss") {
      const w = input.winnerId!;
      if (w !== redId && w !== blueId) {
        throw new AppError(
          "VALIDATION_ERROR",
          "승자는 해당 경기의 레드 또는 블루 선수여야 합니다.",
        );
      }
      winnerId = w;
      loserId = w === redId ? blueId : redId;
    }

    await prisma.$transaction(async (tx) => {
      const before = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { winnerId: true, loserId: true, resultType: true },
      });

      await matchRepository.updateMatchOutcomeDraft(
        input.matchId,
        {
          winnerId,
          loserId,
          resultType: input.resultType,
          resultMemo: mergeDisplayResultMemo(row.resultMemo, input.resultMemo),
        },
        tx,
      );

      const changedWinner =
        before?.winnerId !== winnerId || before?.loserId !== loserId;
      const changedType = before?.resultType !== input.resultType;

      if (changedWinner) {
        await appendBracketChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: ctx.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.bracketType,
          changeType: BracketChangeType.winner_changed,
          beforeData: {
            winnerId: before?.winnerId,
            loserId: before?.loserId,
          },
          afterData: { winnerId, loserId },
          reason: input.resultMemo ?? null,
        });
      }

      if (changedType) {
        await appendBracketChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: ctx.bracketId,
          matchId: input.matchId,
          changedByUserId: actor.userId,
          bracketType: ctx.bracketType,
          changeType: BracketChangeType.result_type_changed,
          beforeData: { resultType: before?.resultType },
          afterData: { resultType: input.resultType },
          reason: input.resultMemo ?? null,
        });
      }

      await notifyMatchStakeholdersAfterChange(
        tx,
        ctx,
        input.matchId,
        "경기 결과 초안이 갱신되었습니다.",
      );
    });
  },

  async cancelMatch(actor: ActorContext, input: CancelMatchInput): Promise<void> {
    const ctx = await ensureMatchOrganizer(actor, input.matchId);

    await prisma.$transaction(async (tx) => {
      const cur = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { status: true },
      });
      if (!cur) {
        throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
      }

      assertBracketMatchStatusTransition(cur.status, "cancelled");

      await matchRepository.updateMatchStatus(input.matchId, "cancelled", tx);

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.match_cancelled,
        beforeData: { status: cur.status },
        afterData: { status: "cancelled" },
        reason: input.reason ?? null,
      });

      await notifyMatchStakeholdersAfterChange(
        tx,
        ctx,
        input.matchId,
        "경기가 취소되었습니다.",
      );
    });
  },

  async listStaffEventMatches(
    link: ResolvedStaffRecorderLink,
  ): Promise<StaffEventMatchListItemVM[]> {
    const rows = await matchRepository.listMatchesByEvent(link.eventId);

    return rows.map((m) => {
      const division = toEventDivisionDisplayInput(m.bracket.division);
      const divisionLabel = division
        ? formatDivisionNameLabel(division)
        : null;

      const results = m.matchResults ?? [];
      const official = results.filter(
        (r) =>
          r.status === MatchRecordStatus.confirmed ||
          r.status === MatchRecordStatus.corrected,
      );
      const hasOfficialResults = official.length >= 2;

      const base: OrganizerEventMatchListItemVM & {
        matchResultStatuses: MatchRecordStatus[];
      } = {
        eventTitle: m.bracket.event?.title ?? "",
        matchId: m.id,
        bracketId: m.bracketId,
        bracketTitle: m.bracket.title,
        bracketType: m.bracket.type,
        bracketIsPublic: m.bracket.isPublic,
        matchIsPublicSparring: resolveMatchIsPublicSparring({
          bracketType: m.bracket.type,
          bracketIsPublic: m.bracket.isPublic,
          resultMemo: m.resultMemo,
        }),
        division,
        divisionLabel,
        roundName: m.roundName,
        matchOrder: m.matchOrder,
        globalMatchOrder: m.globalMatchOrder,
        matchNumber: m.matchNumber,
        matNumber: m.matNumber,
        courtId: m.courtId ?? null,
        courtName: m.court?.name ?? null,
        courtOrder: m.courtOrder ?? null,
        status: m.status,
        fighterRed: m.fighterRed
          ? {
              id: m.fighterRed.id,
              fighterCode: m.fighterRed.fighterCode,
              name: m.fighterRed.name,
              gymName: m.fighterRed.currentGym?.name ?? null,
              handicap: null,
            }
          : null,
        fighterBlue: m.fighterBlue
          ? {
              id: m.fighterBlue.id,
              fighterCode: m.fighterBlue.fighterCode,
              name: m.fighterBlue.name,
              gymName: m.fighterBlue.currentGym?.name ?? null,
              handicap: null,
            }
          : null,
        winnerId: m.winnerId,
        loserId: m.loserId,
        resultType: m.resultType,
        resultMemo: m.resultMemo ?? null,
        isFinishedOps: m.status === "finished",
        hasOfficialResults,
        matchResultStatuses: results.map((r) => r.status),
      };

      return toStaffEventMatchRow(base);
    });
  },

  async updateMatchStatusStaff(
    link: ResolvedStaffRecorderLink,
    input: UpdateMatchStatusInput,
  ): Promise<void> {
    if (!link.canChangeMatchStatus) {
      throw new AppError(
        "FORBIDDEN",
        "이 링크로는 경기 상태를 변경할 수 없습니다.",
      );
    }
    const ctx = await ensureStaffRecorderMatch(link, input.matchId);

    await prisma.$transaction(async (tx) => {
      const cur = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { status: true },
      });
      if (!cur) {
        throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
      }

      assertBracketMatchStatusTransition(cur.status, input.status);

      await matchRepository.updateMatchStatus(input.matchId, input.status, tx);

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByStaffLinkId: link.id,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.match_status_changed,
        beforeData: { status: cur.status },
        afterData: { status: input.status },
        reason: staffAugmentedReason(link.label, input.reason ?? null),
      });

      await notifyMatchStakeholdersAfterChange(
        tx,
        ctx,
        input.matchId,
        "경기 상태가 변경되었습니다.",
      );
    });
  },

  async recordMatchOutcomeDraftStaff(
    link: ResolvedStaffRecorderLink,
    input: RecordMatchOutcomeDraftInput,
  ): Promise<void> {
    if (!link.canRecordOutcomeDraft) {
      throw new AppError("FORBIDDEN", "이 링크로는 결과 초안을 입력할 수 없습니다.");
    }
    const ctx = await ensureStaffRecorderMatch(link, input.matchId);

    const row = await matchRepository.findMatchWithBracketContext(input.matchId);
    if (!row) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    if (row.status === "cancelled") {
      throw new AppError("CONFLICT", "취소된 경기에는 결과를 입력할 수 없습니다.");
    }
    const redId = row.fighterRedId;
    const blueId = row.fighterBlueId;
    if (!redId || !blueId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "레드·블루 선수가 모두 배치된 경기만 결과를 입력할 수 있습니다.",
      );
    }

    let winnerId: string | null = null;
    let loserId: string | null = null;

    if (input.outcomeMode === "win_loss") {
      const w = input.winnerId!;
      if (w !== redId && w !== blueId) {
        throw new AppError(
          "VALIDATION_ERROR",
          "승자는 해당 경기의 레드 또는 블루 선수여야 합니다.",
        );
      }
      winnerId = w;
      loserId = w === redId ? blueId : redId;
    }

    await prisma.$transaction(async (tx) => {
      const before = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { winnerId: true, loserId: true, resultType: true },
      });

      await matchRepository.updateMatchOutcomeDraft(
        input.matchId,
        {
          winnerId,
          loserId,
          resultType: input.resultType,
          resultMemo: mergeDisplayResultMemo(row.resultMemo, input.resultMemo),
        },
        tx,
      );

      const changedWinner =
        before?.winnerId !== winnerId || before?.loserId !== loserId;
      const changedType = before?.resultType !== input.resultType;

      if (changedWinner) {
        await appendBracketChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: ctx.bracketId,
          matchId: input.matchId,
          changedByStaffLinkId: link.id,
          bracketType: ctx.bracketType,
          changeType: BracketChangeType.winner_changed,
          beforeData: {
            winnerId: before?.winnerId,
            loserId: before?.loserId,
          },
          afterData: { winnerId, loserId },
          reason: staffAugmentedReason(link.label, input.resultMemo ?? null),
        });
      }

      if (changedType) {
        await appendBracketChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: ctx.bracketId,
          matchId: input.matchId,
          changedByStaffLinkId: link.id,
          bracketType: ctx.bracketType,
          changeType: BracketChangeType.result_type_changed,
          beforeData: { resultType: before?.resultType },
          afterData: { resultType: input.resultType },
          reason: staffAugmentedReason(link.label, input.resultMemo ?? null),
        });
      }

      await notifyMatchStakeholdersAfterChange(
        tx,
        ctx,
        input.matchId,
        "경기 결과 초안이 갱신되었습니다.",
      );
    });
  },

  async updateMatchBoutSettings(
    actor: ActorContext,
    matchId: string,
    isPublicSparring: boolean,
  ): Promise<void> {
    const ctx = await ensureMatchOrganizer(actor, matchId);
    const row = await matchRepository.findMatchWithBracketContext(matchId);
    if (!row) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    if (row.bracket.type === BracketType.single_elimination) {
      throw new AppError("VALIDATION_ERROR", "토너먼트 경기는 공개스파링을 지정할 수 없습니다.");
    }
    const nextMemo = updateMatchBoutInResultMemo(row.resultMemo, isPublicSparring);
    await prisma.$transaction(async (tx) => {
      await matchRepository.updateMatchOutcomeDraft(
        matchId,
        { resultMemo: nextMemo },
        tx,
      );
      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.match_status_changed,
        beforeData: { isPublicSparring: !isPublicSparring },
        afterData: { isPublicSparring },
        reason: isPublicSparring ? "경기 공개스파링 지정" : "경기 공개스파링 해제",
      });
    });
  },

  async updateMatchOperationalSettings(
    actor: ActorContext,
    matchId: string,
    patch: Pick<MatchOperationalSettings, "roundCount" | "roundTimeSec">,
  ): Promise<void> {
    const ctx = await ensureMatchOrganizer(actor, matchId);
    const row = await matchRepository.findMatchWithBracketContext(matchId);
    if (!row) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    const { settings, displayMemo } = parseMatchOperationalSettings(
      row.resultMemo,
    );
    const nextMemo = encodeMatchOperationalSettings(
      {
        ...settings,
        roundCount: patch.roundCount ?? settings.roundCount,
        roundTimeSec: patch.roundTimeSec ?? settings.roundTimeSec,
      },
      displayMemo,
    );
    await prisma.$transaction(async (tx) => {
      await matchRepository.updateMatchOutcomeDraft(
        matchId,
        { resultMemo: nextMemo },
        tx,
      );
      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId,
        changedByUserId: actor.userId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.match_status_changed,
        afterData: patch,
        reason: "경기 라운드·시간 설정 변경",
      });
    });
  },

  async getFighterFieldMode(actor: ActorContext): Promise<{
    upcoming: FieldModeMatchCardVM[];
    next: FieldModeMatchCardVM | null;
  }> {
    requireRole(actor, ["fighter", "admin"]);
    const fighterId = actor.fighterId;
    if (!fighterId) {
      throw new AppError(
        "FORBIDDEN",
        "선수 정보가 없습니다. 선수 계정으로 이용해 주세요.",
      );
    }

    const rows = await matchRepository.findUpcomingMatchesForFighter(fighterId);
    const upcoming = rows.map((m) => mapFieldModeRow(m, { fighterId }));
    return { upcoming, next: upcoming[0] ?? null };
  },

  async getGymFieldMode(actor: ActorContext): Promise<{
    upcoming: FieldModeMatchCardVM[];
    applicationAttention: {
      pendingApproval: number;
      approvedPaymentIncomplete: number;
    };
  }> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) {
      throw new AppError(
        "FORBIDDEN",
        "체육관 정보가 없습니다. 체육관 계정으로 이용해 주세요.",
      );
    }
    await requireGymOwner(actor, gymId);

    const [rows, applicationAttention] = await Promise.all([
      matchRepository.findUpcomingMatchesForGym(gymId),
      applicationRepository.countGymApplicationAttentionSummary(gymId),
    ]);

    const upcoming = rows.map((m) => mapFieldModeRow(m, { gymId }));
    return { upcoming, applicationAttention };
  },
};
