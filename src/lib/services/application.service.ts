import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  ApplicationStatus,
  ConsentStatus,
  EventStatus,
  FighterStatus,
  PaymentStatus,
  type Prisma,
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
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { registrationRepository } from "@/lib/repositories/registration.repository";
import { gymRepository } from "@/lib/repositories/gym.repository";
import { safeNotify } from "@/lib/notifications/safe-dispatch";
import { notificationService } from "@/lib/services/notification.service";
import { creditService } from "@/lib/services/credit.service";
import { fighterService } from "@/lib/services/fighter.service";
import {
  buildCustomFormSnapshot,
  parseManualFieldsConfig,
  readCustomFormFromAgreementSnapshot,
  resolveApplicationFormMode,
  validateCustomFormAnswers,
  type ApplicationFormMode,
  type CustomFormFieldDefinition,
  type CustomFormSnapshot,
} from "@/lib/application-form/custom-form";
import {
  buildExternalLinkAgreementExtras,
  buildOrganizerManualAgreementExtras,
  buildOrganizerManualCustomFormAnswers,
  EXTERNAL_LINK_ENTRY_SOURCE,
  readApplicationEntrySource,
  readOrganizerManualEntryFromAgreementSnapshot,
  type ManualEntrySource,
} from "@/lib/application-form/organizer-manual-entry";
import { formatFighterGenderLabel } from "@/lib/applications/division-fighter-match";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { formatDivisionSearchLabel } from "@/lib/event-division-fields";
import {
  logManualApplicationCreate,
  logManualApplicationCreateError,
  maskPhoneLast4,
} from "@/lib/applications/manual-application-create-log";
import { toUtcDateOnly } from "@/lib/date-only";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";
import type { ApplyToEventInput } from "@/lib/validators/application.validator";
import type { BulkApplyToEventInput } from "@/lib/validators/bulk-application.validator";
import type { OrganizerManualApplicationInput } from "@/lib/validators/organizer-manual-application.validator";
import type { ExternalRegistrationBatchInput } from "@/lib/validators/external-registration.validator";
import {
  parseExternalRegistrationPublicToken,
  verifyExternalRegistrationPublicToken,
} from "@/lib/external-registration/token";

/** 신청 동의 스냅샷 버전 — 문구·정책 변경 시 함께 올릴 것. */
const APPLICATION_AGREEMENT_SNAPSHOT_VERSION = "v1";

function toIso(d: Date): string {
  return d.toISOString();
}

function formatDivisionLabel(d: EventDivisionDisplayInput): string {
  return formatDivisionSearchLabel(d);
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

type GymApplicationCreateContext = {
  eventId: string;
  divisionId: string;
  gymId: string;
  gymDisplayName: string;
  fighter: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  };
  agreements: ApplyToEventInput["agreements"];
  streamingAgreementRequired: boolean;
  appliedByUserId: string | null;
  appliedAt: Date;
  feeAmount: number;
  applicationProfileImageUrl?: string | null;
  memo?: string | null;
  customFormSnapshot?: CustomFormSnapshot | null;
  organizerManualEntry?: {
    manualCreatedByUserId: string;
  };
  /** 공개 외부링크 등 — agreement snapshot entrySource 확장 */
  applicationEntryExtras?: Record<string, unknown>;
  initialApplicationStatus?: ApplicationStatus;
  initialPaymentStatus?: PaymentStatus;
};

type FighterForManualApplication = {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
};

function buildFighterForManualApplication(input: {
  id: string;
  fighterCode: string;
  name: string;
}): FighterForManualApplication {
  return {
    id: input.id,
    fighterCode: input.fighterCode,
    name: input.name,
    profileImageUrl: null,
    recordWin: 0,
    recordLoss: 0,
    recordDraw: 0,
  };
}

async function assertNoDuplicateManualApplication(input: {
  eventId: string;
  divisionId: string;
  fighterIds: string[];
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  for (const fighterId of input.fighterIds) {
    const existing = await applicationRepository.findExistingApplication(
      input.eventId,
      fighterId,
      input.divisionId,
      input.tx,
    );
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 등록된 선수입니다. 동일 대회·부문 신청이 존재합니다.",
      );
    }
  }
}

async function createGymEventApplication(
  ctx: GymApplicationCreateContext,
  tx?: Prisma.TransactionClient,
): Promise<{ applicationId: string; paymentId: string }> {
  const profileUrl =
    ctx.applicationProfileImageUrl?.trim() ||
    ctx.fighter.profileImageUrl ||
    null;

  const fighterSnapshot = {
    fighterId: ctx.fighter.id,
    fighterCode: ctx.fighter.fighterCode,
    name: ctx.fighter.name,
    gymName: ctx.gymDisplayName,
    profileImageUrl: profileUrl,
    recordSummary: formatRecordSummary(ctx.fighter),
  };

  const gymSnapshot = {
    gymId: ctx.gymId,
    name: ctx.gymDisplayName,
  };

  const applicationAgreementSnapshot: Record<string, unknown> = {
    version: APPLICATION_AGREEMENT_SNAPSHOT_VERSION,
    rulesAgreed: ctx.agreements.rulesAgreed,
    privacyAgreed: ctx.agreements.privacyAgreed,
    resultDisclosureAgreed: ctx.agreements.resultDisclosureAgreed,
    photoVideoAgreed: ctx.agreements.photoVideoAgreed,
    streamingAgreed: ctx.agreements.streamingAgreed ?? false,
    streamingRequired: ctx.streamingAgreementRequired,
    agreedAt: ctx.appliedAt.toISOString(),
    appliedByUserId: ctx.appliedByUserId,
  };
  if (ctx.organizerManualEntry) {
    Object.assign(
      applicationAgreementSnapshot,
      buildOrganizerManualAgreementExtras(
        ctx.organizerManualEntry.manualCreatedByUserId,
      ),
    );
  }
  if (ctx.applicationEntryExtras) {
    Object.assign(applicationAgreementSnapshot, ctx.applicationEntryExtras);
  }
  if (ctx.customFormSnapshot) {
    applicationAgreementSnapshot.customForm = ctx.customFormSnapshot;
  }

  const persist = async (client: Prisma.TransactionClient) =>
    applicationRepository.createEventApplicationWithPayment(
      {
        eventId: ctx.eventId,
        divisionId: ctx.divisionId,
        gymId: ctx.gymId,
        fighterId: ctx.fighter.id,
        fighterSnapshot,
        gymSnapshot,
        applicationAgreementSnapshot:
          applicationAgreementSnapshot as Prisma.InputJsonValue,
        appliedByUserId: ctx.appliedByUserId,
        appliedAt: ctx.appliedAt,
        applicationProfileImageUrl: profileUrl,
        memo: ctx.memo?.trim() || null,
        feeAmount: ctx.feeAmount,
        initialApplicationStatus: ctx.initialApplicationStatus,
        initialPaymentStatus: ctx.initialPaymentStatus,
      },
      client,
    );

  if (tx) {
    return persist(tx);
  }
  return prisma.$transaction(persist);
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
  hasPublicBrackets: boolean;
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

export type OrganizerApplicationPrintVM = {
  eventTitle: string;
  fighterName: string;
  gymName: string;
  divisionLabel: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  appliedAt: string;
  customFormSnapshot: CustomFormSnapshot;
  agreementSnapshot: {
    rulesAgreed: boolean;
    privacyAgreed: boolean;
    resultDisclosureAgreed: boolean;
    photoVideoAgreed: boolean;
    streamingAgreed: boolean;
    streamingRequired: boolean;
    agreedAt: string | null;
  } | null;
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
  /** 표시용 division 필드 — 공통 칩/라벨 helper 입력. */
  division: EventDivisionDisplayInput;
  applicationStatus: ApplicationStatus;
  cancellationSource: import("@/generated/prisma").ApplicationCancellationSource | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
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
  customFormSnapshot: CustomFormSnapshot | null;
  applicationFormMode: ApplicationFormMode;
  isOrganizerManualEntry: boolean;
  entrySource: ManualEntrySource | null;
};

export type OrganizerManualRegistrationOptionsDTO = {
  divisions: EventApplicationDivisionRowDTO[];
  gyms: { id: string; name: string }[];
  feeAmount: number;
  applicationFormMode: ApplicationFormMode;
};

export type EventApplicationFormConfigDTO = {
  mode: ApplicationFormMode;
  templateId: string | null;
  templateTitle: string | null;
  customFields: CustomFormFieldDefinition[];
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
  divisions: EventApplicationDivisionRowDTO[];
  fighters: EventApplicationFighterRowDTO[];
  applicationForm: EventApplicationFormConfigDTO;
};

export type EventApplicationDivisionRowDTO = {
  id: string;
  label: string;
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
};

export type EventApplicationFighterRowDTO = {
  id: string;
  fighterCode: string;
  name: string;
  profileImageUrl: string | null;
  recordSummary: string;
  gender: string;
  genderLabel: string;
  birthDate: string;
  ageGroup: string;
  weightKg: number | null;
  primarySport: string | null;
  appliedDivisionIds: string[];
  guardianPolicyRequires: boolean;
  guardianConsentOk: boolean;
};

export type ApplyToEventSuccessDTO = {
  applicationId: string;
  paymentInstruction: BankPaymentInstructionDTO | null;
};

export type BulkApplyItemResultDTO = {
  fighterId: string;
  fighterName: string;
  divisionId: string;
  outcome: "created" | "skipped" | "failed";
  message?: string;
  applicationId?: string;
};

export type CreateOrganizerManualApplicationResultDTO = {
  applicationId: string;
  fighterId: string;
  gymId: string;
  fighterName: string;
  gymName: string;
};

export type BulkApplyToEventSuccessDTO = {
  totalSelected: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  items: BulkApplyItemResultDTO[];
  paymentInstruction: BankPaymentInstructionDTO | null;
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
    const publicBracketsByEvent = new Map<string, boolean>();
    for (const eid of eventIds) {
      const p = await eventRepository.findEventPaymentSettingFull(eid);
      if (p) paymentByEvent.set(eid, p);
      const brackets = await bracketRepository.listBracketsByEvent(eid);
      publicBracketsByEvent.set(
        eid,
        brackets.some((b) => b.isPublic),
      );
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
        hasPublicBrackets: publicBracketsByEvent.get(row.event.id) ?? false,
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

  async getOrganizerApplicationPrintDetail(
    actor: ActorContext,
    eventId: string,
    applicationId: string,
  ): Promise<OrganizerApplicationPrintVM> {
    await requireOrganizerForEvent(actor, eventId);
    const row = await applicationRepository.findOrganizerApplicationForPrint(
      eventId,
      applicationId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    const snap = row.fighterSnapshot as Record<string, unknown>;
    const fighterName =
      typeof snap.name === "string" ? snap.name : row.fighter.name;
    const gymName = row.gym?.name ?? "—";
    const customFormSnapshot = readCustomFormFromAgreementSnapshot(
      row.applicationAgreementSnapshot,
    );
    if (!customFormSnapshot) {
      throw new AppError(
        "NOT_FOUND",
        "자체 폼형 신청서 답변이 없습니다.",
      );
    }

    const agreement =
      row.applicationAgreementSnapshot &&
      typeof row.applicationAgreementSnapshot === "object" &&
      !Array.isArray(row.applicationAgreementSnapshot)
        ? (row.applicationAgreementSnapshot as Record<string, unknown>)
        : null;

    return {
      eventTitle: row.event.title,
      fighterName,
      gymName,
      divisionLabel: formatDivisionLabel(row.division),
      applicationStatus: row.status,
      paymentStatus: row.paymentStatus,
      appliedAt: row.appliedAt ? toIso(row.appliedAt) : toIso(row.createdAt),
      customFormSnapshot,
      agreementSnapshot: agreement
        ? {
            rulesAgreed: agreement.rulesAgreed === true,
            privacyAgreed: agreement.privacyAgreed === true,
            resultDisclosureAgreed: agreement.resultDisclosureAgreed === true,
            photoVideoAgreed: agreement.photoVideoAgreed === true,
            streamingAgreed: agreement.streamingAgreed === true,
            streamingRequired: agreement.streamingRequired === true,
            agreedAt:
              typeof agreement.agreedAt === "string" ? agreement.agreedAt : null,
          }
        : null,
    };
  },

  async listOrganizerEventApplications(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerApplicationListRowDTO[]> {
    await requireOrganizerForEvent(actor, eventId);
    const eventMeta =
      await eventRepository.findEventWithDivisionsForApplication(eventId);
    const applicationFormMode = resolveApplicationFormMode(
      eventMeta?.applicationFormTemplate
        ? {
            templateId: eventMeta.applicationFormTemplateId,
            fieldsJson: eventMeta.applicationFormTemplate.fieldsJson,
            manualFieldsJson: eventMeta.applicationFormTemplate.manualFieldsJson,
          }
        : null,
    );

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

      const paymentRow = row.payments[0] ?? null;

      const gymName = row.gym?.name ?? "—";
      const summary = consentSummaryFields(policyRequires, consent);

      results.push({
        applicationId: row.id,
        fighterId: row.fighter.id,
        fighterSnapshot: snap,
        fighterProfileImageUrl,
        fighterName,
        gymId: row.gym?.id ?? "",
        gymName,
        divisionId: row.division.id,
        divisionLabel: formatDivisionLabel(row.division),
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
        applicationStatus: row.status,
        cancellationSource: row.cancellationSource ?? null,
        paymentStatus: row.paymentStatus,
        paymentId: paymentRow?.id ?? null,
        depositorName: paymentRow?.depositorName ?? null,
        memo: row.memo,
        appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
        createdAt: toIso(row.createdAt),
        guardianConsentRequired: policyRequires,
        consentSummaryLabel: summary.consentSummaryLabel,
        consentFilterKey: summary.consentFilterKey,
        customFormSnapshot: readCustomFormFromAgreementSnapshot(
          row.applicationAgreementSnapshot,
        ),
        applicationFormMode,
        isOrganizerManualEntry:
          readOrganizerManualEntryFromAgreementSnapshot(
            row.applicationAgreementSnapshot,
          ) != null,
        entrySource: readApplicationEntrySource(
          row.applicationAgreementSnapshot,
        ),
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

      fighterRows.push({
        id: f.id,
        fighterCode: f.fighterCode,
        name: f.name,
        profileImageUrl: f.profileImageUrl,
        recordSummary: formatRecordSummary(f),
        gender: f.gender,
        genderLabel: formatFighterGenderLabel(f.gender),
        birthDate: toIso(f.birthDate),
        ageGroup: publicAgeGroupFromBirthDate(f.birthDate),
        weightKg: f.weight,
        primarySport: f.primarySport,
        appliedDivisionIds: appliedMap.get(f.id) ?? [],
        guardianPolicyRequires: policyRequires,
        guardianConsentOk: true,
      });
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
    const manualConfig = parseManualFieldsConfig(
      event.applicationFormTemplate?.manualFieldsJson,
    );

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
        sportType: d.sportType,
        ruleType: d.ruleType,
        gender: d.gender,
        ageGroup: d.ageGroup,
        weightClass: d.weightClass,
        skillLevel: d.skillLevel,
      })),
      fighters: fighterRows,
      applicationForm: {
        mode: applicationFormMode,
        templateId: event.applicationFormTemplateId,
        templateTitle: event.applicationFormTemplate?.title ?? null,
        customFields: manualConfig.fields,
      },
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

    const existing = await applicationRepository.findExistingApplication(
      input.eventId,
      fighter.id,
      input.divisionId,
    );
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 해당 부문에 신청한 선수입니다. (동일 대회·선수·경기구분 조합은 한 번만 가능합니다.)",
      );
    }

    const gymMeta = await registrationRepository.findGymNameById(gymId);
    const gymDisplayName = gymMeta?.name ?? "체육관";

    const paymentSetting = await eventRepository.findEventPaymentSettingFull(
      input.eventId,
    );

    const appliedAt = new Date();
    const feeAmount = paymentSetting?.feeAmount ?? 0;

    const { applicationId } = await createGymEventApplication({
      eventId: input.eventId,
      divisionId: input.divisionId,
      gymId,
      gymDisplayName,
      fighter,
      agreements: input.agreements,
      streamingAgreementRequired,
      appliedByUserId: actor.userId,
      appliedAt,
      feeAmount,
      applicationProfileImageUrl: input.applicationProfileImageUrl,
      memo: input.memo,
    });

    safeNotify(`application-submitted:${applicationId}`, () =>
      notificationService.notifyApplicationSubmitted({
        eventId: input.eventId,
        eventTitle: event.title,
        count: 1,
      }),
    );

    return {
      applicationId,
      paymentInstruction: paymentSetting
        ? {
            feeAmount: paymentSetting.feeAmount,
            bankName: paymentSetting.bankName,
            accountNumber: paymentSetting.accountNumber,
            accountHolder: paymentSetting.accountHolder,
            depositorRule: paymentSetting.depositorRule,
            paymentDueDate: paymentSetting.paymentDueDate
              ? toIso(paymentSetting.paymentDueDate)
              : null,
          }
        : null,
    };
  },

  async bulkApplyToEventAsGym(
    actor: ActorContext,
    input: BulkApplyToEventInput,
  ): Promise<BulkApplyToEventSuccessDTO> {
    const gymId = await assertGymApplicator(actor);

    const event =
      await eventRepository.findEventWithDivisionsForApplication(input.eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    assertRegistrationWindow(event);

    const streamingAgreementRequired =
      event.liveStreamingEnabled || event.streamingConsentRequired;
    if (streamingAgreementRequired && input.agreements.streamingAgreed !== true) {
      throw new AppError(
        "FORBIDDEN",
        "본 대회는 촬영·스트리밍 관련 동의가 필요합니다.",
      );
    }

    const paymentSetting = await eventRepository.findEventPaymentSettingFull(
      input.eventId,
    );
    const feeAmount = paymentSetting?.feeAmount ?? 0;

    const gymMeta = await registrationRepository.findGymNameById(gymId);
    const gymDisplayName = gymMeta?.name ?? "체육관";

    const divisionIds = new Set(event.divisions.map((d) => d.id));
    const divisionById = new Map(event.divisions.map((d) => [d.id, d]));
    const fighterNameById = new Map(
      (await fighterRepository.listActiveFightersForEventApplication(gymId)).map(
        (f) => [f.id, f.name] as const,
      ),
    );

    const applicationFormMode = resolveApplicationFormMode(
      event.applicationFormTemplate
        ? {
            templateId: event.applicationFormTemplateId,
            fieldsJson: event.applicationFormTemplate.fieldsJson,
            manualFieldsJson: event.applicationFormTemplate.manualFieldsJson,
          }
        : null,
    );
    const customFormFields = parseManualFieldsConfig(
      event.applicationFormTemplate?.manualFieldsJson,
    ).fields;

    const items: BulkApplyItemResultDTO[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const appliedAt = new Date();
    const seenKeys = new Set<string>();

    for (const row of input.applications) {
      const fighterName = fighterNameById.get(row.fighterId) ?? "선수";
      const dedupeKey = `${row.fighterId}:${row.divisionId}`;

      if (seenKeys.has(dedupeKey)) {
        items.push({
          fighterId: row.fighterId,
          fighterName,
          divisionId: row.divisionId,
          outcome: "skipped",
          message: "요청 목록에 중복된 선수·경기구분 조합이 있습니다.",
        });
        skippedCount += 1;
        continue;
      }
      seenKeys.add(dedupeKey);

      if (!divisionIds.has(row.divisionId)) {
        items.push({
          fighterId: row.fighterId,
          fighterName,
          divisionId: row.divisionId,
          outcome: "failed",
          message: "유효하지 않은 부문입니다.",
        });
        failedCount += 1;
        continue;
      }

      const fighter = await fighterRepository.findFighterForGymApplication(
        row.fighterId,
        gymId,
      );
      if (!fighter || fighter.status !== FighterStatus.active) {
        items.push({
          fighterId: row.fighterId,
          fighterName,
          divisionId: row.divisionId,
          outcome: "failed",
          message: "신청할 수 있는 소속 선수가 아닙니다.",
        });
        failedCount += 1;
        continue;
      }

      const existing = await applicationRepository.findExistingApplication(
        input.eventId,
        fighter.id,
        row.divisionId,
      );
      if (existing) {
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId: row.divisionId,
          outcome: "skipped",
          message: "이미 해당 부문에 신청되어 있습니다.",
        });
        skippedCount += 1;
        continue;
      }

      let customFormSnapshot: CustomFormSnapshot | null = null;
      if (applicationFormMode === "custom") {
        const formError = validateCustomFormAnswers(
          customFormFields,
          row.formAnswers,
        );
        if (formError) {
          items.push({
            fighterId: row.fighterId,
            fighterName: fighter.name,
            divisionId: row.divisionId,
            outcome: "failed",
            message: formError,
          });
          failedCount += 1;
          continue;
        }
        const division = divisionById.get(row.divisionId);
        customFormSnapshot = buildCustomFormSnapshot(
          customFormFields,
          row.formAnswers ?? {},
          {
            eventTitle: event.title,
            gymName: gymDisplayName,
            divisionLabel: division ? formatDivisionLabel(division) : "",
            division: {
              sportType: division?.sportType ?? null,
              gender: division?.gender ?? null,
              ageGroup: division?.ageGroup ?? null,
              weightClass: division?.weightClass ?? null,
            },
            fighter: {
              name: fighter.name,
              gender: fighter.gender,
              birthDate: fighter.birthDate,
              weightKg: fighter.weight,
              primarySport: null,
              guardianName: fighter.guardianName,
              guardianPhone: fighter.guardianPhone,
            },
          },
          {
            templateId: event.applicationFormTemplateId!,
            templateTitle:
              event.applicationFormTemplate?.title ?? "자체 신청서",
            capturedAt: appliedAt.toISOString(),
          },
        );
      }

      try {
        const { applicationId } = await createGymEventApplication({
          eventId: input.eventId,
          divisionId: row.divisionId,
          gymId,
          gymDisplayName,
          fighter,
          agreements: input.agreements,
          streamingAgreementRequired,
          appliedByUserId: actor.userId,
          appliedAt,
          feeAmount,
          memo: input.memo,
          customFormSnapshot,
        });
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId: row.divisionId,
          outcome: "created",
          applicationId,
        });
        createdCount += 1;
      } catch (e) {
        const message =
          e instanceof AppError
            ? e.message
            : "신청 생성 중 오류가 발생했습니다.";
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId: row.divisionId,
          outcome: "failed",
          message,
        });
        failedCount += 1;
      }
    }

    if (createdCount > 0) {
      safeNotify(`application-batch-submitted:${input.eventId}`, () =>
        notificationService.notifyApplicationSubmitted({
          eventId: input.eventId,
          eventTitle: event.title,
          count: createdCount,
        }),
      );
    }

    return {
      totalSelected: input.applications.length,
      createdCount,
      skippedCount,
      failedCount,
      items,
      paymentInstruction:
        createdCount > 0 && paymentSetting
          ? {
              feeAmount: paymentSetting.feeAmount,
              bankName: paymentSetting.bankName,
              accountNumber: paymentSetting.accountNumber,
              accountHolder: paymentSetting.accountHolder,
              depositorRule: paymentSetting.depositorRule,
              paymentDueDate: paymentSetting.paymentDueDate
                ? toIso(paymentSetting.paymentDueDate)
                : null,
            }
          : null,
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

    const organizerId = ctx.event.organizerId;

    await prisma.$transaction(async (tx) => {
      await creditService.debitParticipantFee(
        {
          organizerId,
          eventId: ctx.eventId,
          eventApplicationId: applicationId,
          actor,
        },
        tx,
      );

      await applicationRepository.updateApplicationStatus(
        applicationId,
        ApplicationStatus.approved,
        tx,
      );
    });

    const nctxApproved =
      await applicationRepository.findApplicationNotificationContext(
        applicationId,
      );
    if (nctxApproved?.event && nctxApproved.gym && nctxApproved.fighter) {
      safeNotify(`application-approved:${applicationId}`, () =>
        notificationService.notifyApplicationStatusChanged({
          applicationId,
          eventId: nctxApproved.eventId,
          eventTitle: nctxApproved.event.title,
          status: ApplicationStatus.approved,
          gymOwnerUserId: nctxApproved.gym.ownerUserId,
          fighterUserId: nctxApproved.fighter.userId,
        }),
      );
    }

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

    if (
      ctx.status !== ApplicationStatus.pending &&
      ctx.status !== ApplicationStatus.approved
    ) {
      throw new AppError(
        "CONFLICT",
        "대기 또는 승인된 신청만 반려할 수 있습니다.",
      );
    }

    const organizerId = ctx.event.organizerId;

    await prisma.$transaction(async (tx) => {
      if (ctx.status === ApplicationStatus.approved) {
        await creditService.refundParticipantFee(
          {
            organizerId,
            eventId: ctx.eventId,
            eventApplicationId: applicationId,
            actor,
          },
          tx,
        );
      }

      await applicationRepository.patchApplication(
        applicationId,
        {
          status: ApplicationStatus.rejected,
          memo: mergeRejectMemo(ctx.memo ?? null, reason),
        },
        tx,
      );
    });

    const nctxRejected =
      await applicationRepository.findApplicationNotificationContext(
        applicationId,
      );
    if (nctxRejected?.event && nctxRejected.gym && nctxRejected.fighter) {
      safeNotify(`application-rejected:${applicationId}`, () =>
        notificationService.notifyApplicationStatusChanged({
          applicationId,
          eventId: nctxRejected.eventId,
          eventTitle: nctxRejected.event.title,
          status: ApplicationStatus.rejected,
          gymOwnerUserId: nctxRejected.gym.ownerUserId,
          fighterUserId: nctxRejected.fighter.userId,
        }),
      );
    }

    // TODO: 승인 이후 취소·환불 조합 플로우는 별도 정의 (`ApplicationStatus.cancelled` 등).
  },

  async getOrganizerManualRegistrationOptions(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerManualRegistrationOptionsDTO> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);

    const event =
      await eventRepository.findEventWithDivisionsForApplication(eventId);
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

    const paymentSetting =
      await eventRepository.findEventPaymentSettingFull(eventId);
    const gyms = await gymRepository.listActiveGymsForPicker();

    return {
      divisions: event.divisions.map((d) => ({
        id: d.id,
        label: formatDivisionLabel(d),
        sportType: d.sportType,
        ruleType: d.ruleType,
        gender: d.gender,
        ageGroup: d.ageGroup,
        weightClass: d.weightClass,
        skillLevel: d.skillLevel,
      })),
      gyms,
      feeAmount: paymentSetting?.feeAmount ?? 0,
      applicationFormMode,
    };
  },

  async createOrganizerManualApplication(
    actor: ActorContext,
    input: OrganizerManualApplicationInput,
  ): Promise<CreateOrganizerManualApplicationResultDTO> {
    const logBase = {
      eventId: input.eventId,
      divisionId: input.divisionId,
      gymMode: input.gymMode,
      phoneLast4: maskPhoneLast4(input.phone),
    };

    logManualApplicationCreate("start", logBase);

    try {
      requireRole(actor, ["organizer", "admin"]);
      await requireOrganizerForEvent(actor, input.eventId);
      logManualApplicationCreate("auth_checked", logBase);

      const event =
        await eventRepository.findEventWithDivisionsForApplication(input.eventId);
      if (!event) {
        throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
      }

      const division = event.divisions.find((d) => d.id === input.divisionId);
      if (!division) {
        throw new AppError("NOT_FOUND", "유효하지 않은 경기구분/체급입니다.");
      }
      logManualApplicationCreate("division_resolved", {
        ...logBase,
        divisionLabel: formatDivisionLabel(division),
      });

      const phone = normalizeGymFighterPhone(input.phone) || "-";
      const birthDate = toUtcDateOnly(input.birthDate);

      const duplicates =
        await fighterRepository.findIdentityDuplicateCandidates({
          name: input.fighterName,
          birthDate,
          gender: input.gender,
          phone: phone !== "-" ? phone : undefined,
        });

      if (duplicates.length > 0 && !input.confirmDuplicate) {
        throw new AppError(
          "CONFLICT",
          "동일한 선수가 이미 등록되어 있을 수 있습니다. 확인 후 다시 등록해 주세요.",
          {
            duplicateCandidates: duplicates.map((d) => ({
              id: d.id,
              fighterCode: d.fighterCode,
              name: d.name,
            })),
          },
        );
      }

      if (input.confirmDuplicate && duplicates.length > 0) {
        const fighterIdsToCheck = input.linkFighterId
          ? [input.linkFighterId]
          : duplicates.map((d) => d.id);
        await assertNoDuplicateManualApplication({
          eventId: input.eventId,
          divisionId: input.divisionId,
          fighterIds: fighterIdsToCheck,
        });
      }

      logManualApplicationCreate("duplicate_checked", {
        ...logBase,
        duplicateCount: duplicates.length,
        confirmDuplicate: input.confirmDuplicate,
        linkFighterId: input.linkFighterId ?? null,
      });

      const streamingAgreementRequired =
        event.liveStreamingEnabled || event.streamingConsentRequired;

      const manualConfig = parseManualFieldsConfig(
        event.applicationFormTemplate?.manualFieldsJson,
      );
      const applicationFormMode = resolveApplicationFormMode(
        event.applicationFormTemplate
          ? {
              templateId: event.applicationFormTemplateId,
              fieldsJson: event.applicationFormTemplate.fieldsJson,
              manualFieldsJson: event.applicationFormTemplate.manualFieldsJson,
            }
          : null,
      );

      const paymentSetting = await eventRepository.findEventPaymentSettingFull(
        input.eventId,
      );
      const feeAmount = paymentSetting?.feeAmount ?? 0;
      const appliedAt = new Date();

      const memoParts = ["[주최자 직접 등록]"];
      if (input.memo?.trim()) {
        memoParts.push(input.memo.trim());
      }

      const result = await prisma.$transaction(async (tx) => {
        let gym: { id: string; name: string };
        if (input.gymMode === "existing") {
          const row = await gymRepository.findActiveGymById(input.gymId!, tx);
          if (!row) {
            throw new AppError("VALIDATION_ERROR", "체육관을 찾을 수 없습니다.");
          }
          gym = row;
        } else {
          const created = await gymRepository.findOrCreateGymForOrganizerManualEntry(
            input.gymName!,
            tx,
          );
          gym = { id: created.id, name: created.name };
        }
        logManualApplicationCreate("gym_resolved", {
          ...logBase,
          gymId: gym.id,
          gymCreated: input.gymMode === "manual",
        });

        let fighter: FighterForManualApplication;

        if (input.linkFighterId && input.confirmDuplicate) {
          const linked = await fighterRepository.findFighterById(
            input.linkFighterId,
            tx,
          );
          if (!linked) {
            throw new AppError("NOT_FOUND", "연결할 선수를 찾을 수 없습니다.");
          }
          await fighterRepository.linkExistingFighterToGym(tx, {
            fighterId: linked.id,
            gymId: gym.id,
            gymInternalMemo: null,
          });
          await fighterRepository.updateFighterProfile(tx, linked.id, {
            name: input.fighterName.trim(),
            birthDate,
            gender: input.gender,
            phone,
            guardianName: input.guardianName ?? null,
            guardianPhone: input.guardianPhone ?? null,
            status: FighterStatus.active,
          });
          fighter = {
            id: linked.id,
            fighterCode: linked.fighterCode,
            name: input.fighterName.trim(),
            profileImageUrl: linked.profileImageUrl,
            recordWin: linked.recordWin,
            recordLoss: linked.recordLoss,
            recordDraw: linked.recordDraw,
          };
          logManualApplicationCreate("fighter_reused", {
            ...logBase,
            fighterId: fighter.id,
          });
        } else {
          const fighterCode = await fighterService.generateFighterCode(tx);
          const created = await fighterRepository.createFighterWithGymHistory(
            tx,
            {
              fighterCode,
              name: input.fighterName.trim(),
              birthDate,
              gender: input.gender,
              phone,
              guardianName: input.guardianName ?? null,
              guardianPhone: input.guardianPhone ?? null,
              currentGymId: gym.id,
            },
          );
          fighter = buildFighterForManualApplication({
            id: created.id,
            fighterCode: created.fighterCode,
            name: input.fighterName.trim(),
          });
          logManualApplicationCreate("fighter_created", {
            ...logBase,
            fighterId: fighter.id,
          });
        }

        await assertNoDuplicateManualApplication({
          eventId: input.eventId,
          divisionId: input.divisionId,
          fighterIds: [fighter.id],
          tx,
        });

        let customFormSnapshot: CustomFormSnapshot | null = null;
        if (
          applicationFormMode === "custom" &&
          manualConfig.fields.length > 0 &&
          event.applicationFormTemplate
        ) {
          const answers = buildOrganizerManualCustomFormAnswers(
            manualConfig.fields,
          );
          const validationError = validateCustomFormAnswers(
            manualConfig.fields,
            answers,
          );
          if (validationError) {
            throw new AppError("VALIDATION_ERROR", validationError);
          }
          customFormSnapshot = buildCustomFormSnapshot(
            manualConfig.fields,
            answers,
            {
              eventTitle: event.title,
              gymName: gym.name,
              divisionLabel: formatDivisionLabel(division),
              division,
              fighter: {
                name: fighter.name,
                gender: input.gender,
                birthDate,
                weightKg: null,
                primarySport: null,
                guardianName: input.guardianName ?? null,
                guardianPhone: input.guardianPhone ?? null,
              },
            },
            {
              templateId: event.applicationFormTemplate.id,
              templateTitle: event.applicationFormTemplate.title,
              capturedAt: appliedAt.toISOString(),
            },
          );
        }

        const { applicationId } = await createGymEventApplication(
          {
            eventId: input.eventId,
            divisionId: input.divisionId,
            gymId: gym.id,
            gymDisplayName: gym.name,
            fighter,
            agreements: {
              rulesAgreed: true,
              privacyAgreed: true,
              resultDisclosureAgreed: true,
              photoVideoAgreed: true,
              streamingAgreed: streamingAgreementRequired ? true : undefined,
            },
            streamingAgreementRequired,
            appliedByUserId: actor.userId,
            appliedAt,
            feeAmount,
            memo: memoParts.join("\n"),
            customFormSnapshot,
            organizerManualEntry: {
              manualCreatedByUserId: actor.userId,
            },
            initialApplicationStatus: input.applicationStatus,
            initialPaymentStatus: input.paymentStatus,
          },
          tx,
        );

        logManualApplicationCreate("application_created", {
          ...logBase,
          applicationId,
          fighterId: fighter.id,
          gymId: gym.id,
        });

        if (input.applicationStatus === ApplicationStatus.approved) {
          await creditService.debitParticipantFee(
            {
              organizerId: event.organizerId,
              eventId: input.eventId,
              eventApplicationId: applicationId,
              actor,
            },
            tx,
          );
        }

        return {
          applicationId,
          fighterId: fighter.id,
          gymId: gym.id,
          fighterName: fighter.name,
          gymName: gym.name,
        };
      });

      logManualApplicationCreate("success", {
        ...logBase,
        applicationId: result.applicationId,
        fighterId: result.fighterId,
        gymId: result.gymId,
      });

      safeNotify(`application-manual-created:${result.applicationId}`, () =>
        notificationService.notifyApplicationSubmitted({
          eventId: input.eventId,
          eventTitle: event.title,
          count: 1,
        }),
      );

      return result;
    } catch (error) {
      logManualApplicationCreateError("failed", {
        ...logBase,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "unknown",
      });
      throw error;
    }
  },

  /**
   * 공개 외부 체육관 링크 — 다중 선수 atomic batch.
   * Gym 계정은 주최자 공용 external gym만 재사용하고, 표시명은 snapshot에 저장.
   */
  async createExternalLinkBatchApplications(
    input: ExternalRegistrationBatchInput,
  ): Promise<{
    submissionId: string;
    athleteCount: number;
    gymName: string;
    results: Array<{
      applicationId: string;
      fighterName: string;
      divisionId: string;
    }>;
    idempotentReplay: boolean;
  }> {
    const parsed = parseExternalRegistrationPublicToken(input.token);
    if (!parsed) {
      throw new AppError("NOT_FOUND", "유효하지 않은 등록 링크입니다.");
    }

    const link = await prisma.eventExternalRegistrationLink.findUnique({
      where: { id: parsed.linkId },
      include: {
        event: {
          include: {
            divisions: true,
            applicationFormTemplate: true,
            organizer: { select: { id: true, name: true, userId: true } },
          },
        },
      },
    });
    if (!link) {
      throw new AppError("NOT_FOUND", "유효하지 않은 등록 링크입니다.");
    }
    if (
      !verifyExternalRegistrationPublicToken({
        linkId: link.id,
        tokenHash: link.tokenHash,
        signature: parsed.signature,
      })
    ) {
      throw new AppError("NOT_FOUND", "유효하지 않은 등록 링크입니다.");
    }
    if (link.status !== "active" || link.revokedAt) {
      throw new AppError("FORBIDDEN", "사용이 중지된 등록 링크입니다.");
    }
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new AppError("FORBIDDEN", "만료된 등록 링크입니다.");
    }

    assertRegistrationWindow(link.event);

    const existingSubmission =
      await prisma.eventExternalRegistrationSubmission.findUnique({
        where: {
          linkId_clientSubmissionId: {
            linkId: link.id,
            clientSubmissionId: input.clientSubmissionId,
          },
        },
      });
    if (existingSubmission) {
      const ids = Array.isArray(existingSubmission.applicationIds)
        ? (existingSubmission.applicationIds as string[])
        : [];
      return {
        submissionId: existingSubmission.id,
        athleteCount: existingSubmission.athleteCount,
        gymName: existingSubmission.gymNameSnapshot,
        results: ids.map((applicationId) => ({
          applicationId,
          fighterName: "",
          divisionId: "",
        })),
        idempotentReplay: true,
      };
    }

    const divisionById = new Map(link.event.divisions.map((d) => [d.id, d]));
    for (let i = 0; i < input.athletes.length; i += 1) {
      const athlete = input.athletes[i]!;
      if (!divisionById.has(athlete.divisionId)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `${i + 1}번 선수: 유효하지 않은 체급입니다.`,
        );
      }
    }

    const paymentSetting = await eventRepository.findEventPaymentSettingFull(
      link.eventId,
    );
    const feeAmount = paymentSetting?.feeAmount ?? 0;
    const appliedAt = new Date();
    const streamingAgreementRequired =
      link.event.liveStreamingEnabled || link.event.streamingConsentRequired;

    const manualConfig = parseManualFieldsConfig(
      link.event.applicationFormTemplate?.manualFieldsJson,
    );
    const applicationFormMode = resolveApplicationFormMode(
      link.event.applicationFormTemplate
        ? {
            templateId: link.event.applicationFormTemplateId,
            fieldsJson: link.event.applicationFormTemplate.fieldsJson,
            manualFieldsJson: link.event.applicationFormTemplate.manualFieldsJson,
          }
        : null,
    );

    const creditActor: ActorContext = {
      userId: link.event.organizer.userId,
      role: "organizer",
      email: "",
      organizerId: link.organizerId,
    };

    const result = await prisma.$transaction(async (tx) => {
      const replay = await tx.eventExternalRegistrationSubmission.findUnique({
        where: {
          linkId_clientSubmissionId: {
            linkId: link.id,
            clientSubmissionId: input.clientSubmissionId,
          },
        },
      });
      if (replay) {
        return {
          submissionId: replay.id,
          athleteCount: replay.athleteCount,
          gymName: replay.gymNameSnapshot,
          results: [] as Array<{
            applicationId: string;
            fighterName: string;
            divisionId: string;
          }>,
          idempotentReplay: true,
        };
      }

      const gymBucket = await gymRepository.ensureOrganizerExternalRegistrationGym(
        {
          organizerId: link.organizerId,
          organizerName: link.event.organizer.name,
        },
        tx,
      );

      const entryExtras = buildExternalLinkAgreementExtras({
        externalLinkId: link.id,
        clientSubmissionId: input.clientSubmissionId,
        contactName: input.gymInfo.contactName,
        contactPhone: input.gymInfo.contactPhone,
        contactEmail: input.gymInfo.contactEmail,
      });

      const created: Array<{
        applicationId: string;
        fighterName: string;
        divisionId: string;
      }> = [];

      for (const athlete of input.athletes) {
        const division = divisionById.get(athlete.divisionId)!;
        const phone = normalizeGymFighterPhone(athlete.phone) || "-";
        const birthDate = toUtcDateOnly(athlete.birthDate);

        const fighterCode = await fighterService.generateFighterCode(tx);
        const createdFighter = await fighterRepository.createFighterWithGymHistory(
          tx,
          {
            fighterCode,
            name: athlete.fighterName.trim(),
            birthDate,
            gender: athlete.gender,
            phone,
            guardianName: athlete.guardianName ?? null,
            guardianPhone: athlete.guardianPhone ?? null,
            currentGymId: gymBucket.id,
          },
        );
        const fighter = buildFighterForManualApplication({
          id: createdFighter.id,
          fighterCode: createdFighter.fighterCode,
          name: athlete.fighterName.trim(),
        });

        await assertNoDuplicateManualApplication({
          eventId: link.eventId,
          divisionId: athlete.divisionId,
          fighterIds: [fighter.id],
          tx,
        });

        let customFormSnapshot: CustomFormSnapshot | null = null;
        if (
          applicationFormMode === "custom" &&
          manualConfig.fields.length > 0 &&
          link.event.applicationFormTemplate
        ) {
          const answers = buildOrganizerManualCustomFormAnswers(
            manualConfig.fields,
            "외부 체육관 등록",
          );
          customFormSnapshot = buildCustomFormSnapshot(
            manualConfig.fields,
            answers,
            {
              eventTitle: link.event.title,
              gymName: input.gymInfo.gymName,
              divisionLabel: formatDivisionLabel(division),
              division,
              fighter: {
                name: fighter.name,
                gender: athlete.gender,
                birthDate,
                weightKg: null,
                primarySport: null,
                guardianName: athlete.guardianName ?? null,
                guardianPhone: athlete.guardianPhone ?? null,
              },
            },
            {
              templateId: link.event.applicationFormTemplate.id,
              templateTitle: link.event.applicationFormTemplate.title,
              capturedAt: appliedAt.toISOString(),
            },
          );
        }

        const memoParts = [
          `[외부링크 등록] ${input.gymInfo.gymName}`,
          `담당 ${input.gymInfo.contactName} ${input.gymInfo.contactPhone}`,
        ];
        if (input.gymInfo.memo?.trim()) memoParts.push(input.gymInfo.memo.trim());
        if (athlete.memo?.trim()) memoParts.push(athlete.memo.trim());

        const { applicationId } = await createGymEventApplication(
          {
            eventId: link.eventId,
            divisionId: athlete.divisionId,
            gymId: gymBucket.id,
            gymDisplayName: input.gymInfo.gymName,
            fighter,
            agreements: {
              rulesAgreed: true,
              privacyAgreed: true,
              resultDisclosureAgreed: true,
              photoVideoAgreed: true,
              streamingAgreed: streamingAgreementRequired ? true : undefined,
            },
            streamingAgreementRequired,
            appliedByUserId: null,
            appliedAt,
            feeAmount,
            memo: memoParts.join("\n"),
            customFormSnapshot,
            applicationEntryExtras: entryExtras,
            initialApplicationStatus: ApplicationStatus.approved,
            initialPaymentStatus: PaymentStatus.unpaid,
          },
          tx,
        );

        await creditService.debitParticipantFee(
          {
            organizerId: link.organizerId,
            eventId: link.eventId,
            eventApplicationId: applicationId,
            actor: creditActor,
          },
          tx,
        );

        created.push({
          applicationId,
          fighterName: fighter.name,
          divisionId: athlete.divisionId,
        });
      }

      const submission = await tx.eventExternalRegistrationSubmission.create({
        data: {
          linkId: link.id,
          clientSubmissionId: input.clientSubmissionId,
          athleteCount: created.length,
          gymNameSnapshot: input.gymInfo.gymName,
          contactNameSnapshot: input.gymInfo.contactName,
          applicationIds: created.map((c) => c.applicationId),
        },
      });

      await tx.eventExternalRegistrationLink.update({
        where: { id: link.id },
        data: {
          lastSubmittedAt: appliedAt,
          submissionCount: { increment: 1 },
          athleteCount: { increment: created.length },
        },
      });

      return {
        submissionId: submission.id,
        athleteCount: created.length,
        gymName: input.gymInfo.gymName,
        results: created,
        idempotentReplay: false,
      };
    });

    if (!result.idempotentReplay) {
      safeNotify(`application-external-batch:${result.submissionId}`, () =>
        notificationService.notifyApplicationSubmitted({
          eventId: link.eventId,
          eventTitle: link.event.title,
          count: result.athleteCount,
        }),
      );
    }

    return result;
  },
};
