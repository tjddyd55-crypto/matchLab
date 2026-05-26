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
import { eventRepository } from "@/lib/repositories/event.repository";
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
    await assertOrganizerApplication(actor, applicationId);
    await fieldStatusRepository.updateFieldStatus(applicationId, {
      checkInStatus: status,
    });
  },

  async setWeighInStatus(
    actor: ActorContext,
    applicationId: string,
    status: WeighInStatus,
  ): Promise<void> {
    await assertOrganizerApplication(actor, applicationId);
    await fieldStatusRepository.updateFieldStatus(applicationId, {
      weighInStatus: status,
    });
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

    await fieldStatusRepository.updateFieldStatus(applicationId, {
      weighInWeightKg: weightKg,
      ...(weighInStatus ? { weighInStatus } : {}),
    });

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
