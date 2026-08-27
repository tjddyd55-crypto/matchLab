import "server-only";

import {
  ApplicationCancellationSource,
  ApplicationStatus,
  BracketMatchStatus,
  DivisionSelectionType,
  MatchRecordStatus,
  PaymentStatus,
  WeighInStatus,
  type Prisma,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { encryptInsuranceResidentNumber } from "@/lib/athlete-application/encrypt-insurance-rrn";
import {
  clearCancelRestoreSnapshot,
  inferRestoreStatus,
  readCancelRestoreSnapshot,
  withCancelRestoreSnapshot,
  type CancelRestoreSnapshot,
} from "@/lib/applications/cancel-restore-snapshot";
import { resyncFighterMatchSnapshotsForEvent } from "@/lib/brackets/resync-fighter-match-snapshots";
import {
  isExternalRegistrationPlaceholderGymName,
  resolveApplicationGymDisplayName,
} from "@/lib/gym/external-registration-placeholder-gym";
import { toUtcDateOnly } from "@/lib/date-only";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { gymRepository } from "@/lib/repositories/gym.repository";
import { parseApplicationWeightKg } from "@/lib/applications/application-weight";
import { resolveEventDivisionByApplicationWeight } from "@/lib/applications/resolve-event-division";
import { parseApplicantGender } from "@/lib/applicant-excel/normalize";
import {
  buildRecordText,
  parseRecordText,
  type StructuredRecord,
} from "@/lib/fighter/record";
import {
  parseSchoolGradeSelectValue,
  schoolGradeSelectValueFromFields,
} from "@/lib/fighter/school-grade-input";
import type { OrganizerManualApplicationInput } from "@/lib/validators/organizer-manual-application.validator";

export type OrganizerApplicationEditFormDTO = {
  applicationId: string;
  eventId: string;
  fighterId: string;
  fighterName: string;
  gender: string;
  birthDate: string | null;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  gymMode: "existing" | "manual";
  gymId: string | null;
  gymName: string;
  competitionCategory: string;
  discipline: string;
  applicationWeightKg: string;
  divisionId: string | null;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  memo: string;
  recordText: string;
  /** 신청 snapshot 우선 (Fighter 캐시로 덮지 않음) */
  record: StructuredRecord;
  careerText: string;
  /** compact select value (초1~고3) — EventApplication snapshot 기준 */
  schoolGradeSelect: string;
  insuranceRrnMasked: string | null;
  structuralEditBlocked: boolean;
  structuralBlockReason: string | null;
};

function resolveApplicationRecordForEdit(row: {
  recordText: string | null;
  totalBoutsSnapshot: number | null;
  winsSnapshot: number | null;
  drawsSnapshot: number | null;
  lossesSnapshot: number | null;
}): StructuredRecord {
  const hasSnapshot =
    row.totalBoutsSnapshot != null ||
    row.winsSnapshot != null ||
    row.drawsSnapshot != null ||
    row.lossesSnapshot != null;
  if (hasSnapshot) {
    return {
      totalBouts: row.totalBoutsSnapshot ?? 0,
      wins: row.winsSnapshot,
      draws: row.drawsSnapshot,
      losses: row.lossesSnapshot,
    };
  }
  const parsed = parseRecordText(row.recordText);
  if (parsed.ok) return parsed.record;
  return { totalBouts: 0, wins: null, draws: null, losses: null };
}

export type UpdateOrganizerApplicationInput = OrganizerManualApplicationInput & {
  applicationId: string;
  /** 새 주민번호. blank면 기존 cipher 유지 */
  clearInsuranceRrn?: boolean;
};

type DependencyFlags = {
  hasBracketAssignment: boolean;
  hasWeighIn: boolean;
  hasMatchResult: boolean;
  hasPaidPayment: boolean;
};

function isStructuralDivisionChange(
  before: { gender: string; divisionId: string | null },
  after: { gender: string; divisionId: string | null },
): boolean {
  return (
    before.gender !== after.gender || before.divisionId !== after.divisionId
  );
}

async function loadDependencyFlags(
  eventId: string,
  fighterId: string,
  applicationId: string,
): Promise<DependencyFlags> {
  const [matches, results, app, paidPayments] = await Promise.all([
    prisma.bracketMatch.count({
      where: {
        status: { not: BracketMatchStatus.cancelled },
        bracket: { eventId },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
      },
    }),
    prisma.matchResult.count({
      where: {
        fighterId,
        eventId,
        status: {
          in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
        },
      },
    }),
    prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: { weighInStatus: true, weighInWeightKg: true, paymentStatus: true },
    }),
    prisma.eventApplicationPayment.count({
      where: {
        eventApplicationId: applicationId,
        paymentStatus: { in: [PaymentStatus.paid, PaymentStatus.waived] },
      },
    }),
  ]);

  return {
    hasBracketAssignment: matches > 0,
    hasWeighIn:
      Boolean(app) &&
      (app!.weighInStatus !== WeighInStatus.pending ||
        app!.weighInWeightKg != null),
    hasMatchResult: results > 0,
    hasPaidPayment:
      paidPayments > 0 ||
      app?.paymentStatus === PaymentStatus.paid ||
      app?.paymentStatus === PaymentStatus.waived,
  };
}

function assertNoStructuralChangeWhenBlocked(
  deps: DependencyFlags,
  changingStructural: boolean,
  changingWeight: boolean,
): void {
  if (!changingStructural && !changingWeight) return;

  if (deps.hasMatchResult && changingStructural) {
    throw new AppError(
      "CONFLICT",
      "경기 결과가 있는 신청자는 성별·체급을 변경할 수 없습니다.",
    );
  }
  if (deps.hasBracketAssignment && changingStructural) {
    throw new AppError(
      "CONFLICT",
      "이미 대진에 배정된 선수입니다. 경기구분/체급을 변경하려면 먼저 대진 배정을 해제해주세요.",
    );
  }
  if (deps.hasWeighIn && (changingStructural || changingWeight)) {
    throw new AppError(
      "CONFLICT",
      "계체 기록이 있는 신청자의 체중/체급은 변경할 수 없습니다. 계체 기록을 먼저 확인해주세요.",
    );
  }
}

async function resolveEditDivision(
  input: UpdateOrganizerApplicationInput,
  divisions: Array<{
    id: string;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    weightClassName: string | null;
    weightLimitText: string | null;
    sportType: string | null;
  }>,
) {
  if (input.manualDivisionOverride) {
    const weight = parseApplicationWeightKg(input.applicationWeightKg);
    if (!weight.ok) throw new AppError("VALIDATION_ERROR", weight.error);
    const division = divisions.find((d) => d.id === input.divisionId);
    if (!division) {
      throw new AppError("NOT_FOUND", "유효하지 않은 경기구분/체급입니다.");
    }
    return { division, applicationWeightKg: weight.kg };
  }

  const gender = parseApplicantGender(input.gender);
  if (!gender.ok) {
    throw new AppError("VALIDATION_ERROR", "성별을 남/여로 입력해 주세요.");
  }
  const weight = parseApplicationWeightKg(input.applicationWeightKg);
  if (!weight.ok) throw new AppError("VALIDATION_ERROR", weight.error);

  const resolved = resolveEventDivisionByApplicationWeight({
    gender: gender.gender,
    competitionCategory: input.competitionCategory,
    discipline: input.discipline,
    applicationWeightKg: weight.kg,
    divisions,
  });
  if (!resolved.ok) {
    throw new AppError("VALIDATION_ERROR", resolved.reason);
  }
  const division = divisions.find((d) => d.id === resolved.division.id);
  if (!division) {
    throw new AppError("VALIDATION_ERROR", "유효하지 않은 체급입니다.");
  }
  return { division, applicationWeightKg: weight.kg };
}

export const applicationOrganizerLifecycleService = {
  async getEditForm(
    actor: ActorContext,
    applicationId: string,
  ): Promise<OrganizerApplicationEditFormDTO> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
      include: {
        fighter: true,
        division: true,
        gym: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    const snap =
      row.fighterSnapshot && typeof row.fighterSnapshot === "object"
        ? (row.fighterSnapshot as Record<string, unknown>)
        : {};
    const weight =
      typeof snap.applicationWeightKg === "number"
        ? String(snap.applicationWeightKg)
        : "";
    const gymName = resolveApplicationGymDisplayName({
      gymNameSnapshot: row.gymNameSnapshot,
      gymSnapshot: row.gymSnapshot,
      gymRelationName: row.gym?.name,
    });
    const deps = await loadDependencyFlags(
      row.eventId,
      row.fighterId,
      row.id,
    );
    const structuralEditBlocked =
      deps.hasBracketAssignment || deps.hasMatchResult || deps.hasWeighIn;

    // placeholder Gym / 미연결은 표시명 snapshot 편집(manual)이 SSOT.
    // existing 모드로 열면 options.gyms에 없어 저장이 실패하거나 무반응처럼 보인다.
    const linkedGymIsPlaceholder = isExternalRegistrationPlaceholderGymName(
      row.gym?.name,
    );
    const gymMode: "existing" | "manual" =
      row.gymId && !linkedGymIsPlaceholder ? "existing" : "manual";

    return {
      applicationId: row.id,
      eventId: row.eventId,
      fighterId: row.fighterId,
      fighterName: row.fighter.name,
      gender: row.fighter.gender ?? "",
      birthDate: row.fighter.birthDate
        ? row.fighter.birthDate.toISOString().slice(0, 10)
        : null,
      phone: row.fighter.phone ?? "",
      guardianName: row.fighter.guardianName ?? "",
      guardianPhone: row.fighter.guardianPhone ?? "",
      gymMode,
      gymId: gymMode === "existing" ? row.gymId : null,
      gymName,
      competitionCategory: row.division?.ageGroup ?? "",
      discipline: row.division?.sportType ?? "",
      applicationWeightKg: weight,
      divisionId: row.divisionId,
      applicationStatus:
        row.status === ApplicationStatus.pending ||
        row.status === ApplicationStatus.approved
          ? row.status
          : ApplicationStatus.pending,
      paymentStatus: row.paymentStatus,
      memo: row.memo ?? "",
      recordText: row.recordText ?? "",
      record: resolveApplicationRecordForEdit(row),
      careerText: row.careerText ?? "",
      schoolGradeSelect: schoolGradeSelectValueFromFields({
        schoolLevel: row.schoolLevelSnapshot,
        schoolGrade: row.schoolGradeSnapshot,
      }),
      insuranceRrnMasked: row.insuranceRrnMasked,
      structuralEditBlocked,
      structuralBlockReason: deps.hasMatchResult
        ? "경기 결과가 있어 성별·체급 변경이 제한됩니다."
        : deps.hasBracketAssignment
          ? "대진 배정 상태입니다. 성별·체급 변경 전 대진을 해제해주세요."
          : deps.hasWeighIn
            ? "계체 기록이 있어 체중/체급 변경이 제한됩니다."
            : null,
    };
  },

  async updateOrganizerEventApplication(
    actor: ActorContext,
    input: UpdateOrganizerApplicationInput,
  ): Promise<{ applicationId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const existing = await prisma.eventApplication.findUnique({
      where: { id: input.applicationId },
      include: { fighter: true, division: true },
    });
    if (!existing || existing.eventId !== input.eventId) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: { divisions: true },
    });
    if (!event) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    const deps = await loadDependencyFlags(
      existing.eventId,
      existing.fighterId,
      existing.id,
    );
    const prevWeight =
      existing.fighterSnapshot &&
      typeof existing.fighterSnapshot === "object" &&
      typeof (existing.fighterSnapshot as Record<string, unknown>)
        .applicationWeightKg === "number"
        ? ((existing.fighterSnapshot as Record<string, unknown>)
            .applicationWeightKg as number)
        : null;

    const structuralLocked =
      deps.hasBracketAssignment || deps.hasMatchResult || deps.hasWeighIn;

    type DivisionRow = {
      id: string;
      gender: string | null;
      ageGroup: string | null;
      weightClass: string | null;
      weightClassName: string | null;
      weightLimitText: string | null;
      sportType: string | null;
    };
    const divisionRows: DivisionRow[] = event.divisions.map((d) => ({
      id: d.id,
      gender: d.gender,
      ageGroup: d.ageGroup,
      weightClass: d.weightClass,
      weightClassName: d.weightClassName,
      weightLimitText: d.weightLimitText,
      sportType: d.sportType,
    }));

    let division: DivisionRow;
    let applicationWeightKg: number;

    if (structuralLocked && existing.divisionId) {
      // Safe-field edits (gym/name/record) must not fail because disabled
      // structural inputs were omitted from FormData or weight is blank.
      const locked = divisionRows.find((d) => d.id === existing.divisionId);
      if (!locked) {
        throw new AppError("NOT_FOUND", "현재 배정된 체급을 찾을 수 없습니다.");
      }
      const parsedWeight = parseApplicationWeightKg(input.applicationWeightKg);
      applicationWeightKg = parsedWeight.ok
        ? parsedWeight.kg
        : (prevWeight as number);
      if (
        applicationWeightKg == null ||
        !Number.isFinite(applicationWeightKg) ||
        applicationWeightKg <= 0
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "신청체중이 없어 저장할 수 없습니다. 신청자 관리에서 체중을 먼저 입력해 주세요.",
        );
      }
      const requestedDivisionId =
        input.manualDivisionOverride && input.divisionId?.trim()
          ? input.divisionId.trim()
          : existing.divisionId;
      assertNoStructuralChangeWhenBlocked(
        deps,
        isStructuralDivisionChange(
          {
            gender: (existing.fighter.gender ?? "").toLowerCase(),
            divisionId: existing.divisionId,
          },
          {
            gender: input.gender.trim().toLowerCase(),
            divisionId: requestedDivisionId,
          },
        ),
        prevWeight !== null && prevWeight !== applicationWeightKg,
      );
      // Pin existing division — do not auto-reassign while structurally locked.
      division = locked;
      applicationWeightKg = prevWeight ?? applicationWeightKg;
    } else {
      const resolved = await resolveEditDivision(input, divisionRows);
      division = resolved.division;
      applicationWeightKg = resolved.applicationWeightKg;
      assertNoStructuralChangeWhenBlocked(
        deps,
        isStructuralDivisionChange(
          {
            gender: (existing.fighter.gender ?? "").toLowerCase(),
            divisionId: existing.divisionId,
          },
          {
            gender: input.gender.trim().toLowerCase(),
            divisionId: division.id,
          },
        ),
        prevWeight !== applicationWeightKg,
      );
    }

    const phone = normalizeGymFighterPhone(input.phone) || "-";
    const birthDate = input.birthDate ? toUtcDateOnly(input.birthDate) : null;

    let gymId: string | null = null;
    let gymDisplayName: string;
    if (input.gymMode === "existing") {
      const gym = await gymRepository.findActiveGymById(input.gymId!);
      if (!gym) {
        throw new AppError("VALIDATION_ERROR", "체육관을 찾을 수 없습니다.");
      }
      gymId = gym.id;
      gymDisplayName = gym.name;
    } else {
      gymDisplayName = (input.gymName ?? "").trim();
      if (!gymDisplayName) {
        throw new AppError("VALIDATION_ERROR", "체육관명을 입력해 주세요.");
      }
      gymId = null;
    }

    const fighterSnapBase =
      existing.fighterSnapshot &&
      typeof existing.fighterSnapshot === "object" &&
      !Array.isArray(existing.fighterSnapshot)
        ? { ...(existing.fighterSnapshot as Record<string, unknown>) }
        : {};

    const fighterSnapshot = {
      ...fighterSnapBase,
      fighterId: existing.fighterId,
      fighterCode: existing.fighter.fighterCode,
      name: input.fighterName.trim(),
      gymName: gymDisplayName,
      applicationWeightKg,
      ...(input.recordText?.trim()
        ? { recordText: input.recordText.trim() }
        : {}),
      ...(input.careerText?.trim()
        ? { careerText: input.careerText.trim() }
        : {}),
    };

    const gymSnapshot = { gymId, name: gymDisplayName };

    const hasStructuredRecord =
      input.totalBouts != null ||
      input.wins != null ||
      input.draws != null ||
      input.losses != null;
    const structuredRecord = hasStructuredRecord
      ? {
          totalBouts: input.totalBouts ?? 0,
          wins: input.wins ?? null,
          draws: input.draws ?? null,
          losses: input.losses ?? null,
        }
      : null;
    const resolvedRecordText =
      input.recordText?.trim() ||
      (structuredRecord ? buildRecordText(structuredRecord) : null);

    const schoolGradeParsed = parseSchoolGradeSelectValue(
      input.schoolGradeSelect,
    );
    if (!schoolGradeParsed.ok) {
      throw new AppError("VALIDATION_ERROR", schoolGradeParsed.error);
    }
    const schoolFields = schoolGradeParsed.fields;

    const piiPatch: Prisma.EventApplicationUpdateInput = {};
    const rrn = input.residentRegistrationNumber?.trim() ?? "";
    if (input.clearInsuranceRrn) {
      Object.assign(piiPatch, {
        insuranceRrnCipher: null,
        insuranceRrnIv: null,
        insuranceRrnAuthTag: null,
        insuranceRrnKeyVer: null,
        insuranceRrnMasked: null,
      });
    } else if (rrn) {
      const enc = encryptInsuranceResidentNumber(rrn);
      Object.assign(piiPatch, {
        insuranceRrnCipher: Buffer.from(enc.cipher),
        insuranceRrnIv: Buffer.from(enc.iv),
        insuranceRrnAuthTag: Buffer.from(enc.authTag),
        insuranceRrnKeyVer: enc.keyVer,
        insuranceRrnMasked: enc.masked,
      });
    }

    await prisma.$transaction(async (tx) => {
      await fighterRepository.updateFighterProfile(tx, existing.fighterId, {
        name: input.fighterName.trim(),
        birthDate,
        gender: input.gender,
        phone,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        ...(structuredRecord
          ? {
              recordTotalBouts: structuredRecord.totalBouts,
              // Fighter Int 캐시: null(모름)은 0으로만 보관. SSOT는 snapshot.
              recordWin: structuredRecord.wins ?? 0,
              recordDraw: structuredRecord.draws ?? 0,
              recordLoss: structuredRecord.losses ?? 0,
              recordText: resolvedRecordText,
            }
          : {}),
      });

      // 동일 대회·다른 division unique 충돌 방지
      if (existing.divisionId !== division.id) {
        const clash = await applicationRepository.findExistingApplication(
          existing.eventId,
          existing.fighterId,
          division.id,
          tx,
        );
        if (clash && clash.id !== existing.id) {
          throw new AppError(
            "CONFLICT",
            "이미 동일 체급에 등록된 신청이 있습니다.",
          );
        }
      }

      await applicationRepository.patchApplication(
        existing.id,
        {
          gym: gymId ? { connect: { id: gymId } } : { disconnect: true },
          gymSnapshot,
          gymNameSnapshot: gymDisplayName,
          fighterSnapshot,
          division: { connect: { id: division.id } },
          divisionSelectionType: DivisionSelectionType.REGISTERED,
          requestedDivisionText: null,
          recordText: resolvedRecordText,
          careerText: input.careerText?.trim() || null,
          ...(structuredRecord
            ? {
                totalBoutsSnapshot: structuredRecord.totalBouts,
                winsSnapshot: structuredRecord.wins,
                drawsSnapshot: structuredRecord.draws,
                lossesSnapshot: structuredRecord.losses,
              }
            : {}),
          schoolLevelSnapshot: schoolFields.schoolLevel,
          schoolGradeSnapshot: schoolFields.schoolGrade,
          memo: input.memo?.trim() || existing.memo,
          ...piiPatch,
        },
        tx,
      );

      await resyncFighterMatchSnapshotsForEvent(
        existing.eventId,
        existing.fighterId,
        tx,
      );
    });

    return { applicationId: existing.id };
  },

  async restoreOrganizerCancelledApplication(
    actor: ActorContext,
    applicationId: string,
  ): Promise<{ applicationId: string; restoredStatus: ApplicationStatus }> {
    return this.restoreCancellation(actor, applicationId, "organizer");
  },

  async restoreGymCancelledApplication(
    actor: ActorContext,
    applicationId: string,
  ): Promise<{ applicationId: string; restoredStatus: ApplicationStatus }> {
    return this.restoreCancellation(actor, applicationId, "gym");
  },

  async restoreCancellation(
    actor: ActorContext,
    applicationId: string,
    source: "organizer" | "gym",
  ): Promise<{ applicationId: string; restoredStatus: ApplicationStatus }> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
    });
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    const displaySource =
      row.status === ApplicationStatus.cancelled &&
      row.cancellationSource === ApplicationCancellationSource.gym
        ? "gym"
        : row.status === ApplicationStatus.rejected ||
            row.status === ApplicationStatus.cancelled
          ? "organizer"
          : null;

    if (displaySource !== source) {
      throw new AppError(
        "CONFLICT",
        source === "organizer"
          ? "주최측 취소 상태가 아닙니다."
          : "체육관 취소 상태가 아닙니다.",
      );
    }

    const stored = readCancelRestoreSnapshot(row.applicationAgreementSnapshot);
    const restoredStatus =
      stored?.previousStatus ??
      inferRestoreStatus({
        paymentStatus: row.paymentStatus,
        creditRefundedAt: row.creditRefundedAt,
        creditChargeAmount: row.creditChargeAmount,
        checkInStatus: row.checkInStatus,
        weighInStatus: row.weighInStatus,
      });

    const nextAgreement = clearCancelRestoreSnapshot(
      row.applicationAgreementSnapshot,
    );

    const patch: Prisma.EventApplicationUpdateInput = {
      status: restoredStatus,
      cancellationSource: null,
    };
    if (nextAgreement) {
      patch.applicationAgreementSnapshot =
        nextAgreement as Prisma.InputJsonValue;
    }
    await applicationRepository.patchApplication(applicationId, patch);

    return { applicationId, restoredStatus };
  },

  async permanentlyDeleteOrganizerApplication(
    actor: ActorContext,
    applicationId: string,
  ): Promise<{ applicationId: string; fighterDeleted: boolean }> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        eventId: true,
        fighterId: true,
        paymentStatus: true,
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    await requireOrganizerForEvent(actor, row.eventId);

    const deps = await loadDependencyFlags(
      row.eventId,
      row.fighterId,
      row.id,
    );
    if (deps.hasBracketAssignment) {
      throw new AppError(
        "CONFLICT",
        "대진에 배정된 신청자는 바로 삭제할 수 없습니다. 먼저 대진 배정을 해제해주세요.",
      );
    }
    if (deps.hasWeighIn) {
      throw new AppError(
        "CONFLICT",
        "계체 기록이 있는 신청자는 삭제할 수 없습니다.",
      );
    }
    if (deps.hasMatchResult) {
      throw new AppError(
        "CONFLICT",
        "경기 결과가 있는 신청자는 삭제할 수 없습니다.",
      );
    }
    if (deps.hasPaidPayment) {
      throw new AppError(
        "CONFLICT",
        "입금/결제 기록이 있는 신청자는 바로 삭제할 수 없습니다. 먼저 환불 또는 입금 취소를 처리해주세요.",
      );
    }

    let fighterDeleted = false;
    await prisma.$transaction(async (tx) => {
      await tx.eventApplication.delete({ where: { id: applicationId } });

      const fighter = await tx.fighter.findUnique({
        where: { id: row.fighterId },
        select: { id: true, gymMemberId: true, userId: true },
      });
      if (!fighter) return;

      const remaining = await tx.eventApplication.count({
        where: { fighterId: row.fighterId },
      });
      if (remaining > 0) return;
      if (fighter.gymMemberId || fighter.userId) return;

      const profile = await tx.fighterProfile.findUnique({
        where: { fighterId: row.fighterId },
        select: { id: true },
      });
      const anyMatch = await tx.bracketMatch.count({
        where: {
          OR: [
            { fighterRedId: row.fighterId },
            { fighterBlueId: row.fighterId },
          ],
        },
      });
      const anyResult = await tx.matchResult.count({
        where: { fighterId: row.fighterId },
      });
      if (profile || anyMatch > 0 || anyResult > 0) return;

      await tx.fighter.delete({ where: { id: row.fighterId } });
      fighterDeleted = true;
    });

    return { applicationId, fighterDeleted };
  },

  buildCancelRestorePatch(
    previousStatus: ApplicationStatus,
    source: "organizer" | "gym",
    agreement: unknown,
  ): {
    applicationAgreementSnapshot: Prisma.InputJsonValue;
  } {
    const snap: CancelRestoreSnapshot = {
      previousStatus:
        previousStatus === ApplicationStatus.approved
          ? ApplicationStatus.approved
          : ApplicationStatus.pending,
      source,
      at: new Date().toISOString(),
    };
    return {
      applicationAgreementSnapshot: withCancelRestoreSnapshot(
        agreement,
        snap,
      ) as Prisma.InputJsonValue,
    };
  },
};
