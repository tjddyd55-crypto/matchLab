import "server-only";

import {
  BracketChangeType,
  BracketMatchStatus,
  BracketType,
  MatchRecordOutcome,
  MatchRecordStatus,
  NextMatchSlot,
  Prisma,
} from "@/generated/prisma";
import {
  assertFieldOperationsActorRole,
  assertFieldOperationsEventAccess,
  type FieldOperationsCaller,
  toActorCaller,
} from "@/lib/field-operations-auth";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import type {
  PublicEventResultDTO,
  PublicMatchResultDTO,
  PublicRecordFighterDTO,
} from "@/lib/dto/public";
import {
  buildAdvanceWinnerBracketSnapshot,
  buildMatchResultDivisionSnapshotJson,
  buildMatchResultFighterSnapshotJson,
  buildMatchResultOpponentSnapshotJson,
  matchRecordStatusKo,
  outcomeStylePublicLabel,
} from "@/lib/match-result-snapshot";
import { mergeDisplayResultMemo } from "@/lib/match-result-memo";
import {
  requireGymOwner,
  requireOrganizerForEvent,
  requireRole,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import { resultRepository } from "@/lib/repositories/result.repository";
import { tryNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";
import type { ResolvedStaffRecorderLink } from "@/lib/services/event-staff-access.service";
import type {
  ConfirmMatchResultsInput,
  CorrectMatchResultInput,
  VoidMatchResultsInput,
} from "@/lib/validators/result.validator";

/** BracketMatch 결과 필드는 무효 처리 시 초기화한다(MVP). 행정 보존이 필요하면 로그·별도 스냅샷으로 확장한다. */
/** 원격 DB에서 전적 캐시·스냅샷까지 한 트랜잭션으로 처리하므로 기본 5s보다 여유를 둔다. */
const RESULT_MUTATION_TX_OPTIONS = { maxWait: 10_000, timeout: 25_000 } as const;
function changelogReason(
  changeType: BracketChangeType,
  explicit?: string | null,
): string {
  if (explicit?.trim()) return explicit.trim();
  switch (changeType) {
    case BracketChangeType.winner_changed:
      return "결과 확정으로 승자가 확정되었습니다.";
    case BracketChangeType.result_type_changed:
      return "결과 확정으로 결방식이 확정되었습니다.";
    case BracketChangeType.fighter_assigned:
      return "다음 라운드 슬롯에 선수가 배치되었습니다.";
    case BracketChangeType.opponent_changed:
      return "다음 라운드 슬롯의 상대 구성이 변경되었습니다.";
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

async function loadMatchResultBracketCtx(matchId: string) {
  const own = await matchRepository.findMatchOwnershipContext(matchId);
  if (!own) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");

  const bracketRow = await prisma.bracket.findUnique({
    where: { id: own.bracketId },
    select: { type: true },
  });
  if (!bracketRow) throw new AppError("NOT_FOUND", "대진표를 찾을 수 없습니다.");

  return { ...own, bracketType: bracketRow.type };
}

async function ensureMatchResultFieldOpsContext(
  caller: FieldOperationsCaller,
  matchId: string,
) {
  assertFieldOperationsActorRole(caller);
  const ctx = await loadMatchResultBracketCtx(matchId);
  await assertFieldOperationsEventAccess(caller, ctx.eventId);
  return ctx;
}

async function ensureMatchResultOrganizerContext(actor: ActorContext, matchId: string) {
  return ensureMatchResultFieldOpsContext(toActorCaller(actor), matchId);
}

function augmentStaffReason(
  staffLabel: string | undefined,
  explicit?: string | null,
): string | null {
  if (!staffLabel) return explicit?.trim() || null;
  const prefix = `결과입력자(${staffLabel})`;
  const tail = explicit?.trim();
  return tail ? `${prefix}: ${tail}` : prefix;
}

export type ConfirmMatchResultsPrincipal =
  | { kind: "organizer"; actor: ActorContext }
  | { kind: "staff"; link: ResolvedStaffRecorderLink }
  | { kind: "court_head"; eventId: string; courtId: string; label?: string }
  | { kind: "onsite-ops"; eventId: string };

function snapshotJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseFighterSnapshot(raw: unknown): PublicRecordFighterDTO | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.fighterId !== "string" || typeof o.name !== "string") return null;
  return {
    fighterId: o.fighterId,
    fighterCode: typeof o.fighterCode === "string" ? o.fighterCode : "",
    name: o.name,
    gymName: typeof o.gymName === "string" ? o.gymName : null,
    profileImageUrl:
      typeof o.profileImageUrl === "string" ? o.profileImageUrl : null,
  };
}

export type OrganizerEventResultRowVM = {
  id: string;
  matchId: string;
  bracketTitle: string;
  bracketType: BracketType;
  /** 행 관점의 선수 이름 */
  fighterName: string;
  opponentName: string | null;
  result: MatchRecordOutcome;
  resultType: import("@/lib/enums").BracketMatchOutcomeStyle | null;
  resultTypeLabel: string | null;
  status: MatchRecordStatus;
  statusLabel: string;
  matchDate: Date;
  divisionLabel: string | null;
};

export type FighterRecordRowVM = {
  id: string;
  eventTitle: string;
  eventSlug: string | null;
  bracketTitle: string;
  matchNumber: number | null;
  matNumber: number | null;
  result: MatchRecordOutcome;
  resultType: import("@/lib/enums").BracketMatchOutcomeStyle | null;
  matchDate: Date;
  opponentName: string | null;
  /** 체육관 모아보기 전용 */
  fighterId?: string;
  fighterRecordOwnerLabel?: string;
};

export type GymFighterRecordSummaryVM = {
  fighterId: string;
  fighterCode: string;
  name: string;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
};

export const resultService = {
  async confirmMatchResults(
    principal: ConfirmMatchResultsPrincipal,
    input: ConfirmMatchResultsInput,
  ): Promise<void> {
    let ctx;
    let confirmedByUserId: string | null;
    let changedByStaffLinkId: string | null;
    let staffLabel: string | undefined;

    if (principal.kind === "organizer") {
      ctx = await ensureMatchResultOrganizerContext(
        principal.actor,
        input.matchId,
      );
      confirmedByUserId = principal.actor.userId;
      changedByStaffLinkId = null;
    } else if (principal.kind === "onsite-ops") {
      ctx = await loadMatchResultBracketCtx(input.matchId);
      if (ctx.eventId !== principal.eventId) {
        throw new AppError("FORBIDDEN", "해당 대회의 경기만 처리할 수 있습니다.");
      }
      confirmedByUserId = null;
      changedByStaffLinkId = null;
      staffLabel = "현장운영";
    } else if (principal.kind === "staff") {
      throw new AppError(
        "FORBIDDEN",
        "결과 입력 링크(스태프)는 더 이상 사용되지 않습니다. 주심 또는 운영자 화면에서 결과를 처리해 주세요.",
      );
    } else {
      ctx = await loadMatchResultBracketCtx(input.matchId);
      if (ctx.eventId !== principal.eventId) {
        throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
      }
      const courtMatch = await prisma.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { courtId: true },
      });
      if (courtMatch?.courtId !== principal.courtId) {
        throw new AppError("FORBIDDEN", "해당 경기장의 경기만 완료할 수 있습니다.");
      }
      confirmedByUserId = null;
      changedByStaffLinkId = null;
      staffLabel = principal.label ?? "주심판";
    }

    const match = await matchRepository.findMatchWithBracketContext(input.matchId);
    if (!match) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    if (match.status === "cancelled") {
      throw new AppError("CONFLICT", "취소된 경기는 결과 확정할 수 없습니다.");
    }

    const redId = match.fighterRedId;
    const blueId = match.fighterBlueId;
    if (!redId || !blueId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "레드·블루 선수가 모두 배치된 경기만 확정할 수 있습니다.",
      );
    }

    const existingOfficial = await resultRepository.findOfficialResultsByMatchId(
      input.matchId,
    );
    if (existingOfficial.length > 0) {
      throw new AppError(
        "CONFLICT",
        "이미 공식 결과가 등록된 경기입니다. 정정·무효 플로우를 이용해 주세요.",
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

    const eventTitle = match.bracket.event?.title ?? match.bracket.title;

    await prisma.$transaction(async (tx) => {
      const redRow = await fighterRepository.findFighterWithGymForResultSnapshot(
        redId,
        tx,
      );
      const blueRow = await fighterRepository.findFighterWithGymForResultSnapshot(
        blueId,
        tx,
      );
      if (!redRow || !blueRow) {
        throw new AppError("NOT_FOUND", "선수 정보를 불러올 수 없습니다.");
      }

      const beforeBracket = await tx.bracketMatch.findUnique({
        where: { id: input.matchId },
        select: { winnerId: true, loserId: true, resultType: true },
      });

      const divisionSnap = buildMatchResultDivisionSnapshotJson(
        match.bracket.division,
      );

      const redOutcome: MatchRecordOutcome =
        input.outcomeMode === "win_loss"
          ? winnerId === redId
            ? MatchRecordOutcome.win
            : MatchRecordOutcome.loss
          : input.outcomeMode === "draw"
            ? MatchRecordOutcome.draw
            : MatchRecordOutcome.no_contest;

      const blueOutcome: MatchRecordOutcome =
        input.outcomeMode === "win_loss"
          ? winnerId === blueId
            ? MatchRecordOutcome.win
            : MatchRecordOutcome.loss
          : input.outcomeMode === "draw"
            ? MatchRecordOutcome.draw
            : MatchRecordOutcome.no_contest;

      const now = new Date();

      const rows: Prisma.MatchResultCreateManyInput[] = [
        {
          eventId: match.bracket.eventId,
          bracketId: match.bracketId,
          matchId: input.matchId,
          fighterId: redId,
          opponentFighterId: blueId,
          gymId: redRow.currentGymId,
          opponentGymId: blueRow.currentGymId,
          result: redOutcome,
          resultType: input.resultType,
          eventTitleSnapshot: eventTitle,
          fighterSnapshot: snapshotJson(
            buildMatchResultFighterSnapshotJson(redRow),
          ),
          opponentSnapshot: snapshotJson(
            buildMatchResultOpponentSnapshotJson(blueRow),
          ),
          divisionSnapshot: divisionSnap ? snapshotJson(divisionSnap) : undefined,
          matchDate: now,
          status: MatchRecordStatus.confirmed,
          confirmedAt: now,
          confirmedByUserId: confirmedByUserId,
        },
        {
          eventId: match.bracket.eventId,
          bracketId: match.bracketId,
          matchId: input.matchId,
          fighterId: blueId,
          opponentFighterId: redId,
          gymId: blueRow.currentGymId,
          opponentGymId: redRow.currentGymId,
          result: blueOutcome,
          resultType: input.resultType,
          eventTitleSnapshot: eventTitle,
          fighterSnapshot: snapshotJson(
            buildMatchResultFighterSnapshotJson(blueRow),
          ),
          opponentSnapshot: snapshotJson(
            buildMatchResultOpponentSnapshotJson(redRow),
          ),
          divisionSnapshot: divisionSnap ? snapshotJson(divisionSnap) : undefined,
          matchDate: now,
          status: MatchRecordStatus.confirmed,
          confirmedAt: now,
          confirmedByUserId: confirmedByUserId,
        },
      ];

      await matchRepository.updateMatchOutcomeConfirmed(
        input.matchId,
        {
          status: BracketMatchStatus.finished,
          winnerId,
          loserId,
          resultType: input.resultType,
          resultMemo: mergeDisplayResultMemo(match.resultMemo, input.resultMemo),
        },
        tx,
      );

      await resultRepository.createMatchResults(rows, tx);
      await judgeScorecardRepository.lockByMatch(input.matchId, tx);

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByUserId: confirmedByUserId,
        changedByStaffLinkId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.winner_changed,
        beforeData: {
          winnerId: beforeBracket?.winnerId,
          loserId: beforeBracket?.loserId,
        },
        afterData: { winnerId, loserId },
        reason: augmentStaffReason(
          staffLabel,
          input.reason ?? input.resultMemo ?? null,
        ),
      });

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByUserId: confirmedByUserId,
        changedByStaffLinkId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.result_type_changed,
        beforeData: { resultType: beforeBracket?.resultType },
        afterData: { resultType: input.resultType },
        reason: augmentStaffReason(
          staffLabel,
          input.reason ?? input.resultMemo ?? null,
        ),
      });

      await resultRepository.recalculateManyFighterRecordCaches(
        [redId, blueId],
        tx,
      );

      if (
        ctx.bracketType === BracketType.single_elimination &&
        input.outcomeMode === "win_loss" &&
        match.nextMatchId &&
        match.nextMatchSlot &&
        winnerId
      ) {
        const winnerSnap =
          await fighterRepository.findFighterWithGymForResultSnapshot(
            winnerId,
            tx,
          );
        if (!winnerSnap) {
          throw new AppError("NOT_FOUND", "승자 정보를 불러올 수 없습니다.");
        }

        const divisionLabel = match.bracket.division
          ? formatDivisionNameLabel(match.bracket.division)
          : null;

        const bracketSnap = buildAdvanceWinnerBracketSnapshot({
          fighterRow: winnerSnap,
          divisionLabel,
        });

        const corners = await matchRepository.selectMatchCorners(
          match.nextMatchId,
          tx,
        );

        const prevFighterId =
          match.nextMatchSlot === NextMatchSlot.red
            ? corners?.fighterRedId
            : corners?.fighterBlueId;

        const prevSnapshot =
          match.nextMatchSlot === NextMatchSlot.red
            ? corners?.fighterRedSnapshot
            : corners?.fighterBlueSnapshot;

        await matchRepository.updateNextMatchSlot(
          match.nextMatchId,
          match.nextMatchSlot,
          winnerId,
          snapshotJson(bracketSnap),
          tx,
        );

        const advancementType =
          prevFighterId && prevFighterId !== winnerId
            ? BracketChangeType.opponent_changed
            : BracketChangeType.fighter_assigned;

        await appendBracketChangeLog(tx, {
          eventId: ctx.eventId,
          bracketId: ctx.bracketId,
          matchId: match.nextMatchId,
          changedByUserId: confirmedByUserId,
          changedByStaffLinkId,
          bracketType: ctx.bracketType,
          changeType: advancementType,
          beforeData: {
            slot: match.nextMatchSlot,
            fighterId: prevFighterId,
            snapshot: prevSnapshot ?? null,
          },
          afterData: {
            slot: match.nextMatchSlot,
            fighterId: winnerId,
            snapshot: bracketSnap,
          },
          reason: augmentStaffReason(staffLabel, "단판 토너먼트 승자 진출"),
        });
      }
    }, RESULT_MUTATION_TX_OPTIONS);

    // 알림은 확정 커밋 이후에 best-effort — 트랜잭션 타임아웃/롤백을 유발하지 않음
    const pubSlug = match.bracket.event?.publicSlug;
    if (pubSlug) {
      await tryNotify(`result-confirmed:${input.matchId}`, () =>
        notificationService.notifyResultConfirmed({
          eventId: match.bracket.eventId,
          publicSlug: pubSlug,
          bracketTitle: match.bracket.title,
          matchId: input.matchId,
          redFighterId: redId,
          blueFighterId: blueId,
          summaryLine: "공식 결과가 확정되어 전적에 반영되었습니다.",
        }),
      );
    }
  },

  async correctMatchResult(
    caller: FieldOperationsCaller,
    input: CorrectMatchResultInput,
  ): Promise<void> {
    const ctx = await ensureMatchResultFieldOpsContext(caller, input.matchId);
    const changedByUserId =
      caller.kind === "actor" ? caller.actor.userId : null;

    const match = await matchRepository.findMatchWithBracketContext(input.matchId);
    if (!match) throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");

    const redId = match.fighterRedId;
    const blueId = match.fighterBlueId;
    if (!redId || !blueId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선수 정보가 불완전한 경기는 정정할 수 없습니다.",
      );
    }

    const official = await resultRepository.findOfficialResultsByMatchId(
      input.matchId,
    );
    if (official.length === 0) {
      throw new AppError(
        "CONFLICT",
        "정정할 공식 결과(MatchResult)가 없습니다.",
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

    const eventTitle = match.bracket.event?.title ?? match.bracket.title;

    await prisma.$transaction(async (tx) => {
      const redRow = await fighterRepository.findFighterWithGymForResultSnapshot(
        redId,
        tx,
      );
      const blueRow = await fighterRepository.findFighterWithGymForResultSnapshot(
        blueId,
        tx,
      );
      if (!redRow || !blueRow) {
        throw new AppError("NOT_FOUND", "선수 정보를 불러올 수 없습니다.");
      }

      const divisionSnap = buildMatchResultDivisionSnapshotJson(
        match.bracket.division,
      );

      const redOutcome: MatchRecordOutcome =
        input.outcomeMode === "win_loss"
          ? winnerId === redId
            ? MatchRecordOutcome.win
            : MatchRecordOutcome.loss
          : input.outcomeMode === "draw"
            ? MatchRecordOutcome.draw
            : MatchRecordOutcome.no_contest;

      const blueOutcome: MatchRecordOutcome =
        input.outcomeMode === "win_loss"
          ? winnerId === blueId
            ? MatchRecordOutcome.win
            : MatchRecordOutcome.loss
          : input.outcomeMode === "draw"
            ? MatchRecordOutcome.draw
            : MatchRecordOutcome.no_contest;

      const freshOfficial = await resultRepository.findOfficialResultsByMatchId(
        input.matchId,
        tx,
      );

      const byFighter = new Map(freshOfficial.map((r) => [r.fighterId, r]));

      const patchPair: Array<{
        fighterId: string;
        outcome: MatchRecordOutcome;
        row: (typeof freshOfficial)[number];
      }> = [
        { fighterId: redId, outcome: redOutcome, row: byFighter.get(redId)! },
        { fighterId: blueId, outcome: blueOutcome, row: byFighter.get(blueId)! },
      ];

      for (const p of patchPair) {
        if (!p.row) {
          throw new AppError(
            "CONFLICT",
            "MatchResult 행이 불완전합니다. 관리자에게 문의해 주세요.",
          );
        }

        const beforePayload = snapshotJson({
          status: p.row.status,
          result: p.row.result,
          resultType: p.row.resultType,
          fighterSnapshot: p.row.fighterSnapshot,
          opponentSnapshot: p.row.opponentSnapshot,
          divisionSnapshot: p.row.divisionSnapshot,
        });

        const nextFighterSnap =
          p.fighterId === redId
            ? buildMatchResultFighterSnapshotJson(redRow)
            : buildMatchResultFighterSnapshotJson(blueRow);
        const nextOpponentSnap =
          p.fighterId === redId
            ? buildMatchResultOpponentSnapshotJson(blueRow)
            : buildMatchResultOpponentSnapshotJson(redRow);

        await resultRepository.updateMatchResultStatus(
          p.row.id,
          {
            result: p.outcome,
            resultType: input.resultType,
            eventTitleSnapshot: eventTitle,
            fighterSnapshot: snapshotJson(nextFighterSnap),
            opponentSnapshot: snapshotJson(nextOpponentSnap),
            divisionSnapshot: divisionSnap
              ? snapshotJson(divisionSnap)
              : undefined,
            status: MatchRecordStatus.corrected,
          },
          tx,
        );

        const afterPayload = snapshotJson({
          status: MatchRecordStatus.corrected,
          result: p.outcome,
          resultType: input.resultType,
          fighterSnapshot: nextFighterSnap,
          opponentSnapshot: nextOpponentSnap,
          divisionSnapshot: divisionSnap,
        });

        await resultRepository.createMatchResultChangeLog(
          {
            matchResultId: p.row.id,
            matchId: input.matchId,
            changedByUserId,
            beforeResult: beforePayload,
            afterResult: afterPayload,
            reason: input.reason,
          },
          tx,
        );
      }

      await matchRepository.updateMatchOutcomeConfirmed(
        input.matchId,
        {
          status: BracketMatchStatus.finished,
          winnerId,
          loserId,
          resultType: input.resultType,
          resultMemo: mergeDisplayResultMemo(match.resultMemo, input.resultMemo),
        },
        tx,
      );

      await resultRepository.recalculateManyFighterRecordCaches(
        [redId, blueId],
        tx,
      );

      // 단판 진출 재반영은 MVP 범위 밖 — 선수 배치를 별도 화면에서 조정하거나 후속 단계에서 자동 보정 TODO
    }, RESULT_MUTATION_TX_OPTIONS);

    const adjustedPubSlug = match.bracket.event?.publicSlug;
    if (adjustedPubSlug) {
      await tryNotify(`result-adjusted:${input.matchId}`, () =>
        notificationService.notifyOfficialResultAdjusted({
          eventId: match.bracket.eventId,
          publicSlug: adjustedPubSlug,
          bracketTitle: match.bracket.title,
          matchId: input.matchId,
        }),
      );
    }
  },

  async voidMatchResults(
    caller: FieldOperationsCaller,
    input: VoidMatchResultsInput,
  ): Promise<void> {
    const ctx = await ensureMatchResultFieldOpsContext(caller, input.matchId);
    const changedByUserId =
      caller.kind === "actor" ? caller.actor.userId : null;

    const official = await resultRepository.findOfficialResultsByMatchId(
      input.matchId,
    );
    if (official.length === 0) {
      throw new AppError("CONFLICT", "무효화할 공식 결과가 없습니다.");
    }

    const fighterIds = [...new Set(official.map((r) => r.fighterId))];

    const matchRow =
      await matchRepository.findMatchWithBracketContext(input.matchId);

    await prisma.$transaction(async (tx) => {
      for (const row of official) {
        const beforePayload = snapshotJson({
          status: row.status,
          result: row.result,
          resultType: row.resultType,
          fighterSnapshot: row.fighterSnapshot,
          opponentSnapshot: row.opponentSnapshot,
          divisionSnapshot: row.divisionSnapshot,
        });

        await resultRepository.updateMatchResultStatus(
          row.id,
          { status: MatchRecordStatus.voided },
          tx,
        );

        await resultRepository.createMatchResultChangeLog(
          {
            matchResultId: row.id,
            matchId: input.matchId,
            changedByUserId,
            beforeResult: beforePayload,
            afterResult: snapshotJson({ status: MatchRecordStatus.voided }),
            reason: input.reason,
          },
          tx,
        );
      }

      await matchRepository.clearMatchOfficialOutcome(input.matchId, tx);

      await resultRepository.recalculateManyFighterRecordCaches(
        fighterIds,
        tx,
      );

      await appendBracketChangeLog(tx, {
        eventId: ctx.eventId,
        bracketId: ctx.bracketId,
        matchId: input.matchId,
        changedByUserId,
        bracketType: ctx.bracketType,
        changeType: BracketChangeType.result_type_changed,
        beforeData: { note: "공식 MatchResult 무효 처리" },
        afterData: { clearedBracketOutcome: true },
        reason: input.reason,
      });
    }, RESULT_MUTATION_TX_OPTIONS);

    const voidPubSlug = matchRow?.bracket.event?.publicSlug;
    if (voidPubSlug && matchRow?.bracket.title) {
      await tryNotify(`result-voided:${input.matchId}`, () =>
        notificationService.notifyOfficialResultVoided({
          eventId: ctx.eventId,
          publicSlug: voidPubSlug,
          bracketTitle: matchRow.bracket.title,
          matchId: input.matchId,
        }),
      );
    }
  },

  async listEventResults(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerEventResultRowVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const rows = await resultRepository.listResultsByEvent(eventId);

    return rows.map((r) => {
      let divisionLabelResolved: string | null = null;
      const div = r.divisionSnapshot;
      if (div && typeof div === "object") {
        const label = (div as Record<string, unknown>).label;
        divisionLabelResolved =
          typeof label === "string" && label.trim() ? label : null;
      }

      return {
        id: r.id,
        matchId: r.matchId,
        bracketTitle: r.match.bracket.title,
        bracketType: r.match.bracket.type,
        fighterName: r.fighter.name,
        opponentName: r.opponentFighter?.name ?? null,
        result: r.result,
        resultType: r.resultType,
        resultTypeLabel: outcomeStylePublicLabel(r.resultType),
        status: r.status,
        statusLabel: matchRecordStatusKo(r.status),
        matchDate: r.matchDate,
        divisionLabel: divisionLabelResolved,
      };
    });
  },

  async getPublicResultsByEventSlug(slug: string): Promise<PublicEventResultDTO | null> {
    const rows = await resultRepository.listPublicResultsByEventSlug(slug);
    if (rows.length === 0) {
      const ev = await prisma.event.findFirst({
        where: { publicSlug: slug },
        select: { title: true },
      });
      if (!ev) return null;
      return { eventTitle: ev.title, results: [] };
    }

    const eventTitle = rows[0]?.eventTitleSnapshot ?? "";

    const byMatch = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byMatch.get(r.matchId) ?? [];
      arr.push(r);
      byMatch.set(r.matchId, arr);
    }

    const results: PublicMatchResultDTO[] = [];

    for (const [, group] of byMatch) {
      const rep =
        group.find((g) => g.result === MatchRecordOutcome.win) ?? group[0];
      if (!rep) continue;

      const divSnap = rep.divisionSnapshot;
      let divisionLabel: string | null = null;
      if (divSnap && typeof divSnap === "object") {
        const label = (divSnap as Record<string, unknown>).label;
        divisionLabel =
          typeof label === "string" && label.trim() ? label : null;
      }

      const fighter = parseFighterSnapshot(rep.fighterSnapshot);
      const opponent = parseFighterSnapshot(rep.opponentSnapshot);

      results.push({
        matchId: rep.matchId,
        bracketTitle: rep.match.bracket.title,
        bracketType: rep.match.bracket.type,
        divisionLabel,
        matchNumber: rep.match.matchNumber,
        matNumber: rep.match.matNumber,
        matchDate: rep.matchDate.toISOString(),
        fighter,
        opponent,
        result: rep.result,
        resultType: rep.resultType,
        resultTypeLabel: outcomeStylePublicLabel(rep.resultType),
      });
    }

    results.sort(
      (a, b) =>
        new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
    );

    return { eventTitle, results };
  },

  async listFighterRecords(
    actor: ActorContext,
    fighterId: string,
  ): Promise<FighterRecordRowVM[]> {
    requireRole(actor, ["fighter"]);
    if (!actor.fighterId || actor.fighterId !== fighterId) {
      throw new PermissionError(
        "FORBIDDEN",
        "본인 전적만 조회할 수 있습니다.",
      );
    }

    const rows = await resultRepository.listResultsByFighter(fighterId);

    return rows.map((r) => ({
      id: r.id,
      eventTitle: r.event.title,
      eventSlug: r.event.publicSlug,
      bracketTitle: r.match.bracket.title,
      matchNumber: r.match.matchNumber,
      matNumber: r.match.matNumber,
      result: r.result,
      resultType: r.resultType,
      matchDate: r.matchDate,
      opponentName: r.opponentFighter?.name ?? null,
    }));
  },

  async listGymFighterRecords(actor: ActorContext): Promise<{
    summaries: GymFighterRecordSummaryVM[];
    rows: FighterRecordRowVM[];
  }> {
    requireRole(actor, ["gym"]);
    if (!actor.gymId) {
      throw new AppError("VALIDATION_ERROR", "체육관 정보가 없습니다.");
    }

    await requireGymOwner(actor, actor.gymId);

    const fighters = await fighterRepository.listFightersByGym(actor.gymId);
    const summaries: GymFighterRecordSummaryVM[] = fighters.map((f) => ({
      fighterId: f.id,
      fighterCode: f.fighterCode,
      name: f.name,
      recordWin: f.recordWin,
      recordLoss: f.recordLoss,
      recordDraw: f.recordDraw,
    }));

    const ids = fighters.map((f) => f.id);
    const raw = await resultRepository.listResultsByGymFighters(ids);

    const rows: FighterRecordRowVM[] = raw.map((r) => ({
      id: r.id,
      eventTitle: r.event.title,
      eventSlug: r.event.publicSlug,
      bracketTitle: r.match.bracket.title,
      matchNumber: r.match.matchNumber,
      matNumber: r.match.matNumber,
      result: r.result,
      resultType: r.resultType,
      matchDate: r.matchDate,
      opponentName: r.opponentFighter?.name ?? null,
      fighterId: r.fighter.id,
      fighterRecordOwnerLabel: `${r.fighter.name} (${r.fighter.fighterCode})`,
    }));

    return { summaries, rows };
  },
};
