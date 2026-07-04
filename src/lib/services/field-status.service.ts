import "server-only";

import {
  CheckInStatus,
  WeighInFailureResolution,
  WeighInStatus,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import {
  computeFieldEligibility,
  getCheckInStatusLabel,
  getWeighInStatusLabel,
  canAutoEvaluateWeighIn,
} from "@/lib/field-eligibility";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymOwner,
  requireOrganizerForEvent,
  requireRole,
} from "@/lib/permissions";
import {
  fieldStatusRepository,
  type FieldStatusApplicationRow,
} from "@/lib/repositories/field-status.repository";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { safeNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";
import { evaluateWeighInWeight } from "@/lib/weigh-in-eval";
import { resolveWeighInWeightLabel } from "@/lib/event-division-fields";
import {
  buildFighterBracketAssignmentMap,
  type FieldStatusBracketAssignmentVM,
} from "@/lib/field-status-bracket";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { matchRepository } from "@/lib/repositories/match.repository";
import { resultRepository } from "@/lib/repositories/result.repository";
import { matchService } from "@/lib/services/match.service";
import { resultService } from "@/lib/services/result.service";
import { BracketMatchOutcomeStyle } from "@/generated/prisma";

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

function mapRow(row: FieldStatusApplicationRow) {
  const eligibility = computeFieldEligibility({
    checkInStatus: row.checkInStatus,
    weighInStatus: row.weighInStatus,
    weighInFailureResolution: row.weighInFailureResolution,
  });

  return {
    applicationId: row.id,
    fighterId: row.fighterId,
    fighterName: row.fighter.name || readSnapshotName(row.fighterSnapshot),
    gymId: row.gymId,
    gymName: row.gym.name,
    divisionId: row.divisionId,
    divisionLabel: formatDivisionNameLabel(row.division),
    division: {
      sportType: row.division.sportType,
      ruleType: row.division.ruleType,
      gender: row.division.gender,
      ageGroup: row.division.ageGroup,
      weightClass: row.division.weightClass,
      weightClassName: row.division.weightClassName ?? null,
      weightLimitText: row.division.weightLimitText ?? null,
      skillLevel: row.division.skillLevel,
    },
    weightClassLabel: resolveWeighInWeightLabel(row.division),
    checkInStatus: row.checkInStatus,
    checkInStatusLabel: getCheckInStatusLabel(row.checkInStatus),
    weighInStatus: row.weighInStatus,
    weighInStatusLabel: getWeighInStatusLabel(row.weighInStatus),
    weighInWeightKg: row.weighInWeightKg,
    weighInFailureResolution: row.weighInFailureResolution,
    handicapNote: row.handicapNote,
    disqualificationReason: row.disqualificationReason,
    fieldMemo: row.fieldMemo,
    isEligibleForBracket: eligibility.isEligibleForBracket,
    eligibilityLabel: eligibility.eligibilityLabel,
    eligibilityReason: eligibility.eligibilityReason,
  };
}

export type FieldStatusRowDTO = ReturnType<typeof mapRow> & {
  bracketAssignments: FieldStatusBracketAssignmentVM[];
};

export type FieldStatusSummaryDTO = {
  totalApproved: number;
  checkedIn: number;
  pendingCheckIn: number;
  noShow: number;
  weighInPass: number;
  weighInFail: number;
  manualPass: number;
  eligibleCount: number;
};

function buildSummary(rows: FieldStatusRowDTO[]): FieldStatusSummaryDTO {
  return {
    totalApproved: rows.length,
    checkedIn: rows.filter((r) => r.checkInStatus === CheckInStatus.checked_in)
      .length,
    pendingCheckIn: rows.filter((r) => r.checkInStatus === CheckInStatus.pending)
      .length,
    noShow: rows.filter(
      (r) =>
        r.checkInStatus === CheckInStatus.no_show ||
        r.checkInStatus === CheckInStatus.withdrawn ||
        r.checkInStatus === CheckInStatus.disqualified,
    ).length,
    weighInPass: rows.filter((r) => r.weighInStatus === WeighInStatus.pass).length,
    weighInFail: rows.filter(
      (r) =>
        r.weighInStatus === WeighInStatus.fail ||
        r.weighInStatus === WeighInStatus.manual_fail,
    ).length,
    manualPass: rows.filter((r) => r.weighInStatus === WeighInStatus.manual_pass)
      .length,
    eligibleCount: rows.filter((r) => r.isEligibleForBracket).length,
  };
}

async function assertOrganizerApplication(
  actor: ActorContext,
  applicationId: string,
): Promise<FieldStatusApplicationRow> {
  requireRole(actor, ["organizer", "admin"]);
  const row = await fieldStatusRepository.findApprovedApplicationById(
    applicationId,
  );
  if (!row) {
    throw new AppError("NOT_FOUND", "승인된 신청을 찾을 수 없습니다.");
  }
  await requireOrganizerForEvent(actor, row.eventId);
  return row;
}

function dispatchFieldStatusNotification(
  applicationId: string,
  before: { checkInStatus: CheckInStatus; weighInStatus: WeighInStatus },
  after: { checkInStatus: CheckInStatus; weighInStatus: WeighInStatus },
): void {
  if (
    before.checkInStatus === after.checkInStatus &&
    before.weighInStatus === after.weighInStatus
  ) {
    return;
  }

  safeNotify(`field-status:${applicationId}`, async () => {
    const nctx =
      await applicationRepository.findApplicationNotificationContext(
        applicationId,
      );
    if (!nctx?.event || !nctx.gym) return;

    await notificationService.notifyFieldStatusChanged({
      eventId: nctx.eventId,
      eventTitle: nctx.event.title,
      fighterId: nctx.fighterId,
      gymOwnerUserId: nctx.gym.ownerUserId,
      fighterUserId: nctx.fighter.userId,
      previousCheckIn: before.checkInStatus,
      previousWeighIn: before.weighInStatus,
      nextCheckIn: after.checkInStatus,
      nextWeighIn: after.weighInStatus,
    });
  });
}

export const fieldStatusService = {
  async listOrganizerEventFieldStatus(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ rows: FieldStatusRowDTO[]; summary: FieldStatusSummaryDTO }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const [raw, bracketMatches] = await Promise.all([
      fieldStatusRepository.listApprovedApplicationsForEvent(eventId),
      bracketRepository.listFighterBracketMatchesInEvent(eventId),
    ]);
    const assignmentMap = buildFighterBracketAssignmentMap(bracketMatches);
    const rows = raw.map((r) => ({
      ...mapRow(r),
      bracketAssignments: assignmentMap.get(r.fighterId) ?? [],
    }));
    return { rows, summary: buildSummary(rows) };
  },

  async listGymEventFieldStatus(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ eventTitle: string; rows: FieldStatusRowDTO[] }> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) {
      throw new AppError(
        "FORBIDDEN",
        "체육관 정보가 없습니다. 체육관 계정으로 이용해 주세요.",
      );
    }
    await requireGymOwner(actor, gymId);

    const event = await eventRepository.findEventWithDivisionsForApplication(
      eventId,
    );
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }

    const raw = await fieldStatusRepository.listApprovedApplicationsForEvent(
      eventId,
      { gymId },
    );

    return {
      eventTitle: event.title,
      rows: raw.map((r) => ({ ...mapRow(r), bracketAssignments: [] })),
    };
  },

  /** 대진표 후보용 — 승인 신청자 + 출전 확정 정보 */
  async listBracketCandidateFieldStatus(
    eventId: string,
    divisionId?: string | null,
  ): Promise<Map<string, FieldStatusRowDTO>> {
    const raw = await fieldStatusRepository.listApprovedApplicationsForEvent(
      eventId,
      divisionId ? { divisionId } : undefined,
    );
    return new Map(
      raw.map((r) => [
        r.fighterId,
        { ...mapRow(r), bracketAssignments: [] },
      ]),
    );
  },

  /**
   * 현장·계체 탈락 후 대진 패 처리 — draft 후 선택 시 공식 확정(기존 result 흐름).
   */
  async applyFieldBracketOutcome(
    actor: ActorContext,
    input: {
      matchId: string;
      loserFighterId: string;
      resultType: BracketMatchOutcomeStyle;
      confirmOfficial: boolean;
      resultMemo?: string | null;
    },
  ): Promise<void> {
    const match = await matchRepository.findMatchWithBracketContext(
      input.matchId,
    );
    if (!match) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    await requireOrganizerForEvent(actor, match.bracket.eventId);

    const official = await resultRepository.findOfficialResultsByMatchId(
      input.matchId,
    );
    if (official.length > 0) {
      throw new AppError(
        "CONFLICT",
        "이미 공식 결과가 확정된 경기입니다. 정정·무효 플로우를 이용해 주세요.",
      );
    }

    const redId = match.fighterRedId;
    const blueId = match.fighterBlueId;
    if (!redId || !blueId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "양 선수가 배치된 경기만 처리할 수 있습니다.",
      );
    }
    if (
      input.loserFighterId !== redId &&
      input.loserFighterId !== blueId
    ) {
      throw new AppError("VALIDATION_ERROR", "해당 경기의 선수가 아닙니다.");
    }

    const winnerId =
      input.loserFighterId === redId ? blueId : redId;
    const memo = input.resultMemo?.trim() || undefined;

    await matchService.recordMatchOutcomeDraft(actor, {
      matchId: input.matchId,
      outcomeMode: "win_loss",
      winnerId,
      loserId: input.loserFighterId,
      resultType: input.resultType,
      resultMemo: memo,
    });

    if (input.confirmOfficial) {
      await resultService.confirmMatchResults(
        { kind: "organizer", actor },
        {
          matchId: input.matchId,
          outcomeMode: "win_loss",
          winnerId,
          resultType: input.resultType,
          resultMemo: memo,
          reason: memo,
        },
      );
    }
  },

  /** 현장 확인 + 계체 통과(또는 수동 승인)로 출전 확정 조건 충족 */
  async quickConfirmEligibility(
    actor: ActorContext,
    applicationId: string,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);
    const eligibility = computeFieldEligibility({
      checkInStatus: row.checkInStatus,
      weighInStatus: row.weighInStatus,
    });
    if (eligibility.isEligibleForBracket) return;

    if (row.checkInStatus !== CheckInStatus.checked_in) {
      await fieldStatusService.setCheckInStatus(
        actor,
        applicationId,
        CheckInStatus.checked_in,
      );
    }

    const refreshed = await fieldStatusRepository.findApprovedApplicationById(
      applicationId,
    );
    if (!refreshed) return;

    const weighIn = refreshed.weighInStatus;
    if (
      weighIn === WeighInStatus.pass ||
      weighIn === WeighInStatus.manual_pass
    ) {
      return;
    }

    const nextWeighIn =
      weighIn === WeighInStatus.fail || weighIn === WeighInStatus.manual_fail
        ? WeighInStatus.manual_pass
        : WeighInStatus.pass;

    await fieldStatusService.setWeighInStatus(
      actor,
      applicationId,
      nextWeighIn,
    );
  },

  async setCheckInStatus(
    actor: ActorContext,
    applicationId: string,
    status: CheckInStatus,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);
    if (row.checkInStatus === status) return;

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      checkInStatus: status,
    });

    dispatchFieldStatusNotification(
      applicationId,
      {
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
      },
      { checkInStatus: status, weighInStatus: row.weighInStatus },
    );
  },

  async setWeighInStatus(
    actor: ActorContext,
    applicationId: string,
    status: WeighInStatus,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);
    if (row.weighInStatus === status) return;

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      weighInStatus: status,
    });

    dispatchFieldStatusNotification(
      applicationId,
      {
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
      },
      { checkInStatus: row.checkInStatus, weighInStatus: status },
    );
  },

  async recordWeighInWeight(
    actor: ActorContext,
    applicationId: string,
    weightKg: number,
  ): Promise<{ autoStatus: WeighInStatus | null; evaluationReason: string }> {
    const row = await assertOrganizerApplication(actor, applicationId);

    const evaluation = evaluateWeighInWeight(
      weightKg,
      resolveWeighInWeightLabel(row.division),
    );

    let weighInStatus: WeighInStatus | undefined;
    if (canAutoEvaluateWeighIn(row.weighInStatus) && !evaluation.indeterminate) {
      weighInStatus = evaluation.passed
        ? WeighInStatus.pass
        : WeighInStatus.fail;
    }

    const nextWeighIn = weighInStatus ?? row.weighInStatus;

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      weighInWeightKg: weightKg,
      ...(weighInStatus ? { weighInStatus } : {}),
    });

    if (weighInStatus && weighInStatus !== row.weighInStatus) {
      dispatchFieldStatusNotification(
        applicationId,
        {
          checkInStatus: row.checkInStatus,
          weighInStatus: row.weighInStatus,
        },
        { checkInStatus: row.checkInStatus, weighInStatus: nextWeighIn },
      );
    }

    return {
      autoStatus: weighInStatus ?? null,
      evaluationReason: evaluation.reason,
    };
  },

  async saveFieldMemo(
    actor: ActorContext,
    applicationId: string,
    memo: string | null,
  ): Promise<void> {
    await assertOrganizerApplication(actor, applicationId);
    await fieldStatusRepository.updateFieldStatus(applicationId, {
      fieldMemo: memo?.trim() || null,
    });
  },

  async setWeighInFailureResolution(
    actor: ActorContext,
    applicationId: string,
    resolution: import("@/generated/prisma").WeighInFailureResolution,
    handicapNote?: string | null,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);
    const isFailed =
      row.weighInStatus === WeighInStatus.fail ||
      row.weighInStatus === WeighInStatus.manual_fail;

    if (
      !isFailed &&
      resolution === WeighInFailureResolution.pending
    ) {
      throw new AppError(
        "CONFLICT",
        "계체 실패 상태에서만 처리할 수 있습니다.",
      );
    }

    if (
      resolution === WeighInFailureResolution.proceed_with_handicap &&
      !handicapNote?.trim()
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "경기진행 시 핸디캡 안내 문구를 입력해 주세요.",
      );
    }

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      ...(isFailed ? {} : { weighInStatus: WeighInStatus.manual_fail }),
      weighInFailureResolution: resolution,
      handicapNote:
        resolution === WeighInFailureResolution.proceed_with_handicap
          ? handicapNote?.trim() ?? null
          : null,
    });
  },

  async setDisqualificationReason(
    actor: ActorContext,
    applicationId: string,
    reason: string,
  ): Promise<void> {
    await assertOrganizerApplication(actor, applicationId);
    await fieldStatusRepository.updateFieldStatus(applicationId, {
      checkInStatus: CheckInStatus.disqualified,
      disqualificationReason: reason.trim(),
    });
  },

  /** 계체·결과입력 값만 초기화 (신청/선수 정보 유지) */
  async resetFieldStatusInput(
    actor: ActorContext,
    applicationId: string,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);

    const hadFieldInput =
      row.checkInStatus !== CheckInStatus.pending ||
      row.weighInWeightKg != null ||
      row.weighInStatus !== WeighInStatus.pending ||
      row.weighInFailureResolution !== WeighInFailureResolution.pending ||
      row.handicapNote != null ||
      row.disqualificationReason != null ||
      row.fieldMemo != null;

    if (!hadFieldInput) {
      throw new AppError(
        "VALIDATION_ERROR",
        "초기화할 계체·현장 입력이 없습니다.",
      );
    }

    const nextCheckIn = CheckInStatus.pending;

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      weighInWeightKg: null,
      weighInStatus: WeighInStatus.pending,
      weighInFailureResolution: WeighInFailureResolution.pending,
      handicapNote: null,
      disqualificationReason: null,
      checkInStatus: nextCheckIn,
      fieldMemo: null,
    });

    if (
      row.checkInStatus !== nextCheckIn ||
      row.weighInStatus !== WeighInStatus.pending
    ) {
      dispatchFieldStatusNotification(
        applicationId,
        {
          checkInStatus: row.checkInStatus,
          weighInStatus: row.weighInStatus,
        },
        {
          checkInStatus: nextCheckIn,
          weighInStatus: WeighInStatus.pending,
        },
      );
    }
  },
};
