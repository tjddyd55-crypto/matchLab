import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  ApplicationStatus,
  ConsentStatus,
  EventStatus,
  FighterStatus,
  PaymentStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  requiresGuardianConsentFromFighterProfile,
} from "@/lib/consent-policy";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymOwner,
  requireOrganizerForEvent,
  requireRole,
} from "@/lib/permissions";
import { applicationRepository } from "@/lib/repositories/application.repository";
import { consentRepository } from "@/lib/repositories/consent.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { gymEventFeeRepository } from "@/lib/repositories/gym-event-fee.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";
import { notificationService } from "@/lib/services/notification.service";
import type { ApplyToEventInput } from "@/lib/validators/application.validator";

/** 신청 동의 스냅샷 버전 — 문구·정책 변경 시 함께 올릴 것. */
const APPLICATION_AGREEMENT_SNAPSHOT_VERSION = "v1";

function toIso(d: Date): string {
  return d.toISOString();
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

function formatRecordSummary(row: {
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
}): string {
  return `${row.recordWin}승 ${row.recordLoss}패 ${row.recordDraw}무`;
}

function mergeRejectMemo(existing: string | null, reason?: string): string | null {
  const r = reason?.trim();
  if (!r) return existing ?? null;
  const tag = `[주최자 반려] ${r}`;
  if (!existing?.trim()) return tag;
  return `${existing.trim()}\n${tag}`;
}

function assertRegistrationWindow(event: {
  registrationStartDate: Date;
  registrationEndDate: Date;
  status: EventStatus;
}): void {
  if (event.status !== EventStatus.open) {
    throw new AppError(
      "FORBIDDEN",
      "신청이 열려 있지 않은 대회입니다.",
    );
  }
  const now = new Date();
  if (now < event.registrationStartDate || now > event.registrationEndDate) {
    throw new AppError("FORBIDDEN", "신청 기간이 아닙니다.");
  }
}

async function assertGymApplicator(actor: ActorContext): Promise<string> {
  requireRole(actor, ["gym", "admin"]);
  const gymId = actor.gymId;
  if (!gymId) {
    throw new AppError(
      "FORBIDDEN",
      "체육관 정보가 없습니다. 체육관 계정으로 이용해 주세요.",
    );
  }
  await requireGymOwner(actor, gymId);
  return gymId;
}

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

export type BankPaymentInstructionDTO = {
  feeAmount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  depositorRule: string | null;
  paymentDueDate: string | null;
};

export type GymApplicationListRowDTO = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  divisionLabel: string;
  fighterName: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  appliedAt: string | null;
  createdAt: string;
  registrationEndDate: string;
  paymentInstruction: BankPaymentInstructionDTO | null;
  /** 주최자에게 선수 1인당 입금할 금액(참가비 설정 기준) */
  organizerDepositPerAthlete: number | null;
  /** 체육관이 선수에게 안내하는 참가비 */
  gymAthleteFeeGuidance: number | null;
};

/** 선수 계정에 연결된 프로필 기준 — 계좌번호 등 입금 세부는 포함하지 않음 */
export type FighterLinkedApplicationRowDTO = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStatus: EventStatus;
  divisionLabel: string;
  fighterName: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  appliedAt: string | null;
  createdAt: string;
  registrationEndDate: string;
  /** 체육관이 설정한 선수 안내 참가비 — 미설정 시 null */
  gymAthleteFeeGuidance: number | null;
};

export type OrganizerApplicationListRowDTO = {
  applicationId: string;
  fighterId: string;
  fighterSnapshot: Record<string, unknown>;
  fighterProfileImageUrl: string | null;
  fighterName: string;
  gymId: string;
  gymName: string;
  divisionId: string;
  divisionLabel: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  paymentId: string;
  depositorName: string | null;
  memo: string | null;
  appliedAt: string | null;
  createdAt: string;
  guardianConsentRequired: boolean;
  consentSummaryLabel: string;
  consentFilterKey:
    | "not_required"
    | "completed"
    | "draft"
    | "missing"
    | "other";
};

export type EventApplicationFormDTO = {
  event: {
    id: string;
    title: string;
    registrationStartDate: string;
    registrationEndDate: string;
    liveStreamingEnabled: boolean;
    streamingConsentRequired: boolean;
    streamingNoticeText: string | null;
    streamingAgreementRequired: boolean;
    organizerDepositPerAthlete: number | null;
    gymAthleteFeeGuidance: number | null;
    gymAthleteFeeNote: string | null;
  };
  divisions: { id: string; label: string }[];
  fighters: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordSummary: string;
    appliedDivisionIds: string[];
    guardianPolicyRequires: boolean;
    guardianConsentOk: boolean;
  }[];
};

export type ApplyToEventSuccessDTO = {
  applicationId: string;
  paymentInstruction: BankPaymentInstructionDTO;
};

function consentSummaryFields(
  policyRequires: boolean,
  consent: {
    consentStatus: ConsentStatus;
  } | null,
): Pick<
  OrganizerApplicationListRowDTO,
  "consentSummaryLabel" | "consentFilterKey"
> {
  if (!policyRequires) {
    return { consentSummaryLabel: "동의 불필요", consentFilterKey: "not_required" };
  }
  if (!consent) {
    return { consentSummaryLabel: "미작성", consentFilterKey: "missing" };
  }
  switch (consent.consentStatus) {
    case ConsentStatus.completed:
      return { consentSummaryLabel: "완료", consentFilterKey: "completed" };
    case ConsentStatus.draft:
      return { consentSummaryLabel: "작성중", consentFilterKey: "draft" };
    default:
      return { consentSummaryLabel: "확인 필요", consentFilterKey: "other" };
  }
}

export const applicationService = {
  async listGymApplications(actor: ActorContext): Promise<GymApplicationListRowDTO[]> {
    requireRole(actor, ["gym", "admin"]);
    const gymId = actor.gymId;
    if (!gymId) return [];
    await requireGymOwner(actor, gymId);

    const rows = await applicationRepository.listGymApplications(gymId);
    const eventIds = [...new Set(rows.map((r) => r.event.id))];
    const paymentByEvent = new Map<
      string,
      NonNullable<
        Awaited<ReturnType<typeof eventRepository.findEventPaymentSettingFull>>
      >
    >();
    for (const eid of eventIds) {
      const p = await eventRepository.findEventPaymentSettingFull(eid);
      if (p) paymentByEvent.set(eid, p);
    }

    const gymFees = await gymEventFeeRepository.listByGym(gymId);
    const gfMap = new Map(gymFees.map((g) => [g.eventId, g]));

    return rows.map((row) => {
      const paymentFull = paymentByEvent.get(row.event.id);
      const gf = gfMap.get(row.event.id);
      return {
        id: row.id,
        eventId: row.event.id,
        eventTitle: row.event.title,
        eventSlug: row.event.publicSlug,
        divisionLabel: formatDivisionLabel(row.division),
        fighterName: readSnapshotName(row.fighterSnapshot),
        applicationStatus: row.status,
        paymentStatus: row.paymentStatus,
        appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
        createdAt: toIso(row.createdAt),
        registrationEndDate: toIso(row.event.registrationEndDate),
        paymentInstruction: paymentFull
          ? {
              feeAmount: paymentFull.feeAmount,
              bankName: paymentFull.bankName,
              accountNumber: paymentFull.accountNumber,
              accountHolder: paymentFull.accountHolder,
              depositorRule: paymentFull.depositorRule,
              paymentDueDate: paymentFull.paymentDueDate
                ? toIso(paymentFull.paymentDueDate)
                : null,
            }
          : null,
        organizerDepositPerAthlete: paymentFull?.feeAmount ?? null,
        gymAthleteFeeGuidance: gf?.athleteFeeAmount ?? null,
      };
    });
  },

  async listFighterLinkedApplications(
    actor: ActorContext,
  ): Promise<FighterLinkedApplicationRowDTO[]> {
    requireRole(actor, ["fighter", "admin"]);
    const fighterId = actor.fighterId;
    if (!fighterId) return [];

    const rows =
      await applicationRepository.listApplicationsForFighter(fighterId);
    const feeRows = await Promise.all(
      rows.map((r) =>
        gymEventFeeRepository.findByGymAndEvent(r.gymId, r.event.id),
      ),
    );

    return rows.map((row, i) => ({
      id: row.id,
      eventId: row.event.id,
      eventTitle: row.event.title,
      eventSlug: row.event.publicSlug,
      eventStatus: row.event.status,
      divisionLabel: formatDivisionLabel(row.division),
      fighterName: readSnapshotName(row.fighterSnapshot),
      applicationStatus: row.status,
      paymentStatus: row.paymentStatus,
      appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
      createdAt: toIso(row.createdAt),
      registrationEndDate: toIso(row.event.registrationEndDate),
      gymAthleteFeeGuidance: feeRows[i]?.athleteFeeAmount ?? null,
    }));
  },

  async listOrganizerEventApplications(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerApplicationListRowDTO[]> {
    await requireOrganizerForEvent(actor, eventId);
    const rows =
      await applicationRepository.listApplicationsForOrganizerEvent(eventId);

    const results: OrganizerApplicationListRowDTO[] = [];
    for (const row of rows) {
      const fighterProfile = row.fighter;
      const policyRequires = fighterProfile
        ? requiresGuardianConsentFromFighterProfile({
            birthDate: fighterProfile.birthDate,
            schoolName: fighterProfile.schoolName,
            grade: fighterProfile.grade,
            guardianName: fighterProfile.guardianName,
            guardianPhone: fighterProfile.guardianPhone,
          })
        : false;

      const consent = policyRequires
        ? await consentRepository.findLatestConsentForFighter(row.fighter.id)
        : null;

      const snap =
        row.fighterSnapshot &&
        typeof row.fighterSnapshot === "object" &&
        !Array.isArray(row.fighterSnapshot)
          ? (row.fighterSnapshot as Record<string, unknown>)
          : {};

      const fighterName =
        typeof snap.name === "string" ? snap.name : row.fighter.name;

      const fighterProfileImageUrl =
        typeof snap.profileImageUrl === "string"
          ? snap.profileImageUrl
          : row.fighter.profileImageUrl ?? null;

      const paymentRow = row.payments[0];
      if (!paymentRow) {
        throw new AppError(
          "INTERNAL",
          "결제 행이 없는 신청입니다. 관리자에게 문의해 주세요.",
        );
      }

      const gymName = row.gym?.name ?? "—";
      const summary = consentSummaryFields(policyRequires, consent);

      results.push({
        applicationId: row.id,
        fighterId: row.fighter.id,
        fighterSnapshot: snap,
        fighterProfileImageUrl,
        fighterName,
        gymId: row.gym.id,
        gymName,
        divisionId: row.division.id,
        divisionLabel: formatDivisionLabel(row.division),
        applicationStatus: row.status,
        paymentStatus: row.paymentStatus,
        paymentId: paymentRow.id,
        depositorName: paymentRow.depositorName,
        memo: row.memo,
        appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
        createdAt: toIso(row.createdAt),
        guardianConsentRequired: policyRequires,
        consentSummaryLabel: summary.consentSummaryLabel,
        consentFilterKey: summary.consentFilterKey,
      });
    }

    return results;
  },

  async getEventApplicationForm(
    actor: ActorContext,
    eventId: string,
  ): Promise<EventApplicationFormDTO> {
    const gymId = await assertGymApplicator(actor);

    const event =
      await eventRepository.findEventWithDivisionsForApplication(eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }

    assertRegistrationWindow(event);

    const fighters =
      await fighterRepository.listActiveFightersForEventApplication(gymId);
    const applications =
      await applicationRepository.findApplicationsForEventAndGym(eventId, gymId);

    const appliedMap = new Map<string, string[]>();
    for (const app of applications) {
      const list = appliedMap.get(app.fighterId) ?? [];
      list.push(app.divisionId);
      appliedMap.set(app.fighterId, list);
    }

    const streamingAgreementRequired =
      event.liveStreamingEnabled || event.streamingConsentRequired;

    const paymentRow = await eventRepository.findEventPaymentSetting(event.id);
    const gymFeeRow = await gymEventFeeRepository.findByGymAndEvent(
      gymId,
      event.id,
    );

    const fighterRows: EventApplicationFormDTO["fighters"] = [];
    for (const f of fighters) {
      const policyRequires = requiresGuardianConsentFromFighterProfile({
        birthDate: f.birthDate,
        schoolName: f.schoolName,
        grade: f.grade,
        guardianName: f.guardianName,
        guardianPhone: f.guardianPhone,
      });

      let guardianConsentOk = true;
      if (policyRequires) {
        const consent = await consentRepository.findLatestConsentForFighter(
          f.id,
        );
        guardianConsentOk = consent?.consentStatus === ConsentStatus.completed;
      }

      fighterRows.push({
        id: f.id,
        fighterCode: f.fighterCode,
        name: f.name,
        profileImageUrl: f.profileImageUrl,
        recordSummary: formatRecordSummary(f),
        appliedDivisionIds: appliedMap.get(f.id) ?? [],
        guardianPolicyRequires: policyRequires,
        guardianConsentOk,
      });
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        registrationStartDate: toIso(event.registrationStartDate),
        registrationEndDate: toIso(event.registrationEndDate),
        liveStreamingEnabled: event.liveStreamingEnabled,
        streamingConsentRequired: event.streamingConsentRequired,
        streamingNoticeText: event.streamingNoticeText,
        streamingAgreementRequired,
        organizerDepositPerAthlete: paymentRow?.feeAmount ?? null,
        gymAthleteFeeGuidance: gymFeeRow?.athleteFeeAmount ?? null,
        gymAthleteFeeNote: gymFeeRow?.note ?? null,
      },
      divisions: event.divisions.map((d) => ({
        id: d.id,
        label: formatDivisionLabel(d),
      })),
      fighters: fighterRows,
    };
  },

  async applyToEventAsGym(
    actor: ActorContext,
    input: ApplyToEventInput,
  ): Promise<ApplyToEventSuccessDTO> {
    const gymId = await assertGymApplicator(actor);

    const event =
      await eventRepository.findEventWithDivisionsForApplication(input.eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    assertRegistrationWindow(event);

    const belongs = await eventRepository.findDivisionBelongsToEvent(
      input.divisionId,
      input.eventId,
    );
    if (!belongs) {
      throw new AppError("NOT_FOUND", "유효하지 않은 부문입니다.");
    }

    const streamingAgreementRequired =
      event.liveStreamingEnabled || event.streamingConsentRequired;
    if (streamingAgreementRequired) {
      if (input.agreements.streamingAgreed !== true) {
        throw new AppError(
          "FORBIDDEN",
          "본 대회는 촬영·스트리밍 관련 동의가 필요합니다.",
        );
      }
    }

    const fighter = await fighterRepository.findFighterForGymApplication(
      input.fighterId,
      gymId,
    );
    if (!fighter || fighter.status !== FighterStatus.active) {
      throw new AppError(
        "FORBIDDEN",
        "신청할 수 있는 소속 선수만 선택할 수 있습니다.",
      );
    }

    if (
      requiresGuardianConsentFromFighterProfile({
        birthDate: fighter.birthDate,
        schoolName: fighter.schoolName,
        grade: fighter.grade,
        guardianName: fighter.guardianName,
        guardianPhone: fighter.guardianPhone,
      })
    ) {
      const consent = await consentRepository.findLatestConsentForFighter(
        fighter.id,
      );
      if (consent?.consentStatus !== ConsentStatus.completed) {
        throw new AppError(
          "FORBIDDEN",
          "보호자 동의가 완료된 선수만 신청할 수 있습니다.",
        );
      }
    }

    const existing = await applicationRepository.findExistingApplication(
      input.eventId,
      fighter.id,
      input.divisionId,
    );
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 해당 부문에 신청한 선수입니다. (동일 대회·선수·부문 조합은 한 번만 가능합니다.)",
      );
    }

    const gymMeta = await registrationRepository.findGymNameById(gymId);
    const gymDisplayName = gymMeta?.name ?? "체육관";

    const paymentSetting = await eventRepository.findEventPaymentSettingFull(
      input.eventId,
    );
    if (!paymentSetting) {
      throw new AppError(
        "NOT_FOUND",
        "참가비 입금 정보가 설정되지 않았습니다. 주최자에게 문의해 주세요.",
      );
    }

    const profileUrl =
      input.applicationProfileImageUrl?.trim() ||
      fighter.profileImageUrl ||
      null;

    const fighterSnapshot = {
      fighterId: fighter.id,
      fighterCode: fighter.fighterCode,
      name: fighter.name,
      gymName: gymDisplayName,
      profileImageUrl: profileUrl,
      recordSummary: formatRecordSummary(fighter),
    };

    const gymSnapshot = {
      gymId,
      name: gymDisplayName,
    };

    const appliedAt = new Date();

    // TODO: 향후 Event 단위 GuardianConsent 레코드를 두고 대회별 보호자 동의를 확장할 때,
    // applicationAgreementSnapshot 와 연계하는 마이그레이션을 검토한다.

    const applicationAgreementSnapshot = {
      version: APPLICATION_AGREEMENT_SNAPSHOT_VERSION,
      rulesAgreed: input.agreements.rulesAgreed,
      privacyAgreed: input.agreements.privacyAgreed,
      resultDisclosureAgreed: input.agreements.resultDisclosureAgreed,
      photoVideoAgreed: input.agreements.photoVideoAgreed,
      streamingAgreed: input.agreements.streamingAgreed ?? false,
      streamingRequired: streamingAgreementRequired,
      agreedAt: appliedAt.toISOString(),
      appliedByUserId: actor.userId,
    };

    const { applicationId } = await prisma.$transaction(async (tx) => {
      return applicationRepository.createEventApplicationWithPayment(
        {
          eventId: input.eventId,
          divisionId: input.divisionId,
          gymId,
          fighterId: fighter.id,
          fighterSnapshot,
          gymSnapshot,
          applicationAgreementSnapshot,
          appliedByUserId: actor.userId,
          appliedAt,
          applicationProfileImageUrl: profileUrl,
          memo: input.memo?.trim() || null,
          feeAmount: paymentSetting.feeAmount,
        },
        tx,
      );
    });

    return {
      applicationId,
      paymentInstruction: {
        feeAmount: paymentSetting.feeAmount,
        bankName: paymentSetting.bankName,
        accountNumber: paymentSetting.accountNumber,
        accountHolder: paymentSetting.accountHolder,
        depositorRule: paymentSetting.depositorRule,
        paymentDueDate: paymentSetting.paymentDueDate
          ? toIso(paymentSetting.paymentDueDate)
          : null,
      },
    };
  },

  async approveEventApplication(
    actor: ActorContext,
    applicationId: string,
  ): Promise<void> {
    const ctx =
      await applicationRepository.findApplicationOwnershipContext(applicationId);
    if (!ctx) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }
    await requireOrganizerForEvent(actor, ctx.eventId);

    if (ctx.status !== ApplicationStatus.pending) {
      throw new AppError(
        "CONFLICT",
        "대기 중인 신청만 승인할 수 있습니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await applicationRepository.updateApplicationStatus(
        applicationId,
        ApplicationStatus.approved,
        tx,
      );

      const nctx =
        await applicationRepository.findApplicationNotificationContext(
          applicationId,
          tx,
        );
      if (
        nctx?.event &&
        nctx.gym &&
        nctx.fighter &&
        nctx.event.publicSlug
      ) {
        await notificationService.notifyApplicationStatusChanged(
          {
            applicationId,
            eventId: nctx.eventId,
            eventTitle: nctx.event.title,
            publicSlug: nctx.event.publicSlug,
            status: ApplicationStatus.approved,
            gymOwnerUserId: nctx.gym.ownerUserId,
            fighterUserId: nctx.fighter.userId,
          },
          tx,
        );
      }
    });

    // MVP: 입금 미확인(unpaid)이어도 승인 가능 — 향후 대회별 "입금 확인 후 승인" 정책 확장 TODO.
    void ctx.paymentStatus;
  },

  async rejectEventApplication(
    actor: ActorContext,
    applicationId: string,
    reason?: string,
  ): Promise<void> {
    const ctx =
      await applicationRepository.findApplicationOwnershipContext(applicationId);
    if (!ctx) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }
    await requireOrganizerForEvent(actor, ctx.eventId);

    if (ctx.status !== ApplicationStatus.pending) {
      throw new AppError(
        "CONFLICT",
        "대기 중인 신청만 반려할 수 있습니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await applicationRepository.patchApplication(
        applicationId,
        {
          status: ApplicationStatus.rejected,
          memo: mergeRejectMemo(ctx.memo ?? null, reason),
        },
        tx,
      );

      const nctx =
        await applicationRepository.findApplicationNotificationContext(
          applicationId,
          tx,
        );
      if (
        nctx?.event &&
        nctx.gym &&
        nctx.fighter &&
        nctx.event.publicSlug
      ) {
        await notificationService.notifyApplicationStatusChanged(
          {
            applicationId,
            eventId: nctx.eventId,
            eventTitle: nctx.event.title,
            publicSlug: nctx.event.publicSlug,
            status: ApplicationStatus.rejected,
            gymOwnerUserId: nctx.gym.ownerUserId,
            fighterUserId: nctx.fighter.userId,
          },
          tx,
        );
      }
    });

    // TODO: 승인 이후 취소·환불 조합 플로우는 별도 정의 (`ApplicationStatus.cancelled` 등).
  },
};
