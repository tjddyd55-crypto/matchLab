import "server-only";

import {
  CheckInStatus,
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
  });

  return {
    applicationId: row.id,
    fighterId: row.fighterId,
    fighterName: row.fighter.name || readSnapshotName(row.fighterSnapshot),
    gymId: row.gymId,
    gymName: row.gym.name,
    divisionId: row.divisionId,
    divisionLabel: formatDivisionNameLabel(row.division),
    weightClassLabel: row.division.weightClass,
    checkInStatus: row.checkInStatus,
    checkInStatusLabel: getCheckInStatusLabel(row.checkInStatus),
    weighInStatus: row.weighInStatus,
    weighInStatusLabel: getWeighInStatusLabel(row.weighInStatus),
    weighInWeightKg: row.weighInWeightKg,
    fieldMemo: row.fieldMemo,
    isEligibleForBracket: eligibility.isEligibleForBracket,
    eligibilityLabel: eligibility.eligibilityLabel,
    eligibilityReason: eligibility.eligibilityReason,
  };
}

export type FieldStatusRowDTO = ReturnType<typeof mapRow>;

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

    const raw = await fieldStatusRepository.listApprovedApplicationsForEvent(
      eventId,
    );
    const rows = raw.map(mapRow);
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
      rows: raw.map(mapRow),
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
    return new Map(raw.map((r) => [r.fighterId, mapRow(r)]));
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

  /**
   * 출전 확정 단축 — 현장 확인(pending→checked_in) 후 계체 통과(pending→pass).
   * 기존 setCheckInStatus / setWeighInStatus만 순서대로 호출한다.
   */
  async quickConfirmEligibility(
    actor: ActorContext,
    applicationId: string,
  ): Promise<void> {
    const row = await assertOrganizerApplication(actor, applicationId);

    if (
      row.checkInStatus !== CheckInStatus.checked_in &&
      row.checkInStatus !== CheckInStatus.pending
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "미출석·철회·실격 상태에서는 출전 확정할 수 없습니다.",
      );
    }

    if (row.checkInStatus === CheckInStatus.pending) {
      await fieldStatusService.setCheckInStatus(
        actor,
        applicationId,
        CheckInStatus.checked_in,
      );
    }

    const refreshed = await fieldStatusRepository.findApprovedApplicationById(
      applicationId,
    );
    if (!refreshed) {
      throw new AppError("NOT_FOUND", "승인된 신청을 찾을 수 없습니다.");
    }

    if (
      refreshed.weighInStatus === WeighInStatus.pass ||
      refreshed.weighInStatus === WeighInStatus.manual_pass
    ) {
      return;
    }

    if (refreshed.weighInStatus !== WeighInStatus.pending) {
      throw new AppError(
        "VALIDATION_ERROR",
        "계체 실패 상태에서는 출전 확정할 수 없습니다. 수동 승인을 사용해 주세요.",
      );
    }

    await fieldStatusService.setWeighInStatus(
      actor,
      applicationId,
      WeighInStatus.pass,
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
      row.division.weightClass,
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
};
