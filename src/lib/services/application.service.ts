import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  ApplicationStatus,
  BracketMatchStatus,
  ConsentStatus,
  EventStatus,
  FighterStatus,
  MatchRecordStatus,
  PaymentStatus,
  WeighInStatus,
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
  analyzeApplicantExcelRows,
  assertPreviewReadyToCommit,
  identityFromExistingApplication,
} from "@/lib/applicant-excel/analyze";
import {
  APPLICANT_EXCEL_MAX_BYTES,
} from "@/lib/applicant-excel/columns";
import { parseApplicantExcelWorkbook } from "@/lib/applicant-excel/parse";
import {
  buildApplicantExcelSampleWorkbook,
  workbookToBuffer,
} from "@/lib/applicant-excel/sample";
import { encryptInsuranceResidentNumber } from "@/lib/athlete-application/encrypt-insurance-rrn";
import {
  buildApplicantAssignmentCountMap,
  resolveApplicantAssignmentCount,
} from "@/lib/applications/applicant-list-filters";
import {
  buildInsuranceConsentSnapshot,
  insuranceConsentDisplayLabel,
  readInsuranceConsentSnapshot,
} from "@/lib/athlete-application/insurance-consent";
import type {
  ApplicantExcelCommitResult,
  ApplicantExcelPreview,
} from "@/lib/applicant-excel/types";
import { compactText, foldKey, parseApplicantGender } from "@/lib/applicant-excel/normalize";
import { fighterBirthDateForPersist } from "@/lib/fighter/birth-date";
import { nullableDetailsFromFighterCache } from "@/lib/fighter/record";
import {
  parseSchoolGradeSelectValue,
  resolveGymApplySchoolGradeSnapshot,
} from "@/lib/fighter/school-grade-input";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
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
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import { additionalInfoService } from "@/lib/services/additional-info.service";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import {
  logManualApplicationCreate,
  logManualApplicationCreateError,
  maskPhoneLast4,
} from "@/lib/applications/manual-application-create-log";
import { toUtcDateOnly } from "@/lib/date-only";
import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";
import type { ApplyToEventInput } from "@/lib/validators/application.validator";
import type { BulkApplyToEventInput } from "@/lib/validators/bulk-application.validator";
import type { OrganizerManualApplicationInput } from "@/lib/validators/organizer-manual-application.validator";
import type { ExternalRegistrationBatchInput } from "@/lib/validators/external-registration.validator";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";
import {
  parseExternalRegistrationPublicToken,
  verifyExternalRegistrationPublicToken,
} from "@/lib/external-registration/token";
import { assertExternalRegistrationEligible } from "@/lib/external-registration/eligibility";
import { parseApplicationWeightKg } from "@/lib/applications/application-weight";
import { assertApplicationDivisionCompatible } from "@/lib/applications/application-division-compatibility";
import { appendApplicationStructuralAudit } from "@/lib/applications/application-structural-audit";
import { validateFirstStageApplication } from "@/lib/applications/first-stage-application";
import { resolveEventDivisionByApplicationWeight } from "@/lib/applications/resolve-event-division";
import type { NormalizedCompetitionCategory } from "@/lib/applications/competition-category";

/** 신청 동의 스냅샷 버전 — 문구·정책 변경 시 함께 올릴 것. */
const APPLICATION_AGREEMENT_SNAPSHOT_VERSION = "v1";

function toIso(d: Date): string {
  return d.toISOString();
}

function formatDivisionLabel(d: EventDivisionDisplayInput): string {
  return formatDivisionSearchLabel(d);
}

/** 체급 성별 ↔ 선수 성별 — 혼성/빈 값은 허용 */
function divisionGenderAllowsFighter(
  divisionGender: string | null | undefined,
  fighterGender: string,
): boolean {
  const raw = (divisionGender ?? "").trim();
  if (!raw) return true;
  const folded = foldKey(raw);
  if (folded === "mixed" || folded === "혼성") return true;
  const divisionParsed = parseApplicantGender(raw);
  const fighterParsed = parseApplicantGender(fighterGender);
  if (divisionParsed.ok && fighterParsed.ok) {
    return divisionParsed.gender === fighterParsed.gender;
  }
  return folded === foldKey(fighterGender);
}

function toApplicationDivisionRow(
  d: EventDivisionDisplayInput & { id: string },
): EventApplicationDivisionRowDTO {
  return {
    id: d.id,
    label: formatDivisionLabel(d),
    sportType: d.sportType,
    ruleType: d.ruleType,
    gender: d.gender,
    ageGroup: d.ageGroup,
    weightClass: d.weightClass,
    weightClassName: d.weightClassName ?? null,
    weightLimitText: d.weightLimitText ?? null,
    skillLevel: d.skillLevel,
  };
}

function resolveDivisionForApplicationWeight<
  T extends EventDivisionDisplayInput & { id: string },
>(input: {
  gender: string;
  competitionCategory: string;
  discipline?: string | null;
  applicationWeightKg: number | string;
  divisions: T[];
}): {
  division: T;
  applicationWeightKg: number;
  category: NormalizedCompetitionCategory;
} {
  const gender = parseApplicantGender(input.gender);
  if (!gender.ok) {
    throw new AppError("VALIDATION_ERROR", "성별을 남/여로 입력해 주세요.");
  }
  const weight = parseApplicationWeightKg(input.applicationWeightKg);
  if (!weight.ok) {
    throw new AppError("VALIDATION_ERROR", weight.error);
  }
  const resolved = resolveEventDivisionByApplicationWeight({
    gender: gender.gender,
    competitionCategory: input.competitionCategory,
    discipline: input.discipline,
    applicationWeightKg: weight.kg,
    divisions: input.divisions,
  });
  if (!resolved.ok) {
    throw new AppError("VALIDATION_ERROR", resolved.reason);
  }
  const division = input.divisions.find((d) => d.id === resolved.division.id);
  if (!division) {
    throw new AppError("VALIDATION_ERROR", "유효하지 않은 체급입니다.");
  }
  return {
    division,
    applicationWeightKg: weight.kg,
    category: resolved.category,
  };
}

function formatRecordSummary(row: {
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
  recordTotalBouts?: number | null;
}): string {
  const total =
    row.recordTotalBouts ??
    row.recordWin + row.recordLoss + row.recordDraw;
  const detailSum = row.recordWin + row.recordLoss + row.recordDraw;
  if (total === 0) return "무전";
  // Fighter Int 캐시: 총전만 저장 시 W/D/L=0 → "N전"
  if (detailSum === 0) {
    return `${total}전`;
  }
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
  divisionId: string | null;
  divisionSelectionType?: "REGISTERED" | "OTHER";
  requestedDivisionText?: string | null;
  /** MATCHON 등록 Gym만. 외부/Excel 소속은 null */
  gymId: string | null;
  gymDisplayName: string;
  fighter: {
    id: string;
    fighterCode: string;
    name: string;
    profileImageUrl: string | null;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
    recordTotalBouts?: number;
    schoolLevel?: string | null;
    schoolGrade?: number | null;
  };
  agreements: ApplyToEventInput["agreements"];
  streamingAgreementRequired: boolean;
  appliedByUserId: string | null;
  appliedAt: Date;
  feeAmount: number;
  applicationProfileImageUrl?: string | null;
  memo?: string | null;
  recordText?: string | null;
  careerText?: string | null;
  /** 구조화 전적 snapshot — Fighter.recordTotalBouts 보다 이 값 우선 */
  totalBoutsSnapshot?: number | null;
  winsSnapshot?: number | null;
  drawsSnapshot?: number | null;
  lossesSnapshot?: number | null;
  schoolLevelSnapshot?: string | null;
  schoolGradeSnapshot?: number | null;
  applicationWeightKg?: number | null;
  insuranceRrnDigits?: string | null;
  insuranceConsent?: import("@/lib/athlete-application/insurance-consent").InsuranceConsentSnapshot | null;
  /** false면 RRN·보험동의 없이 저장 (1차 신청·엑셀·주최자 직접등록). 기본 true */
  insurancePiiRequired?: boolean;
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
  recordTotalBouts?: number;
};

function buildFighterForManualApplication(input: {
  id: string;
  fighterCode: string;
  name: string;
  recordWin?: number;
  recordLoss?: number;
  recordDraw?: number;
  recordTotalBouts?: number;
}): FighterForManualApplication {
  return {
    id: input.id,
    fighterCode: input.fighterCode,
    name: input.name,
    profileImageUrl: null,
    recordWin: input.recordWin ?? 0,
    recordLoss: input.recordLoss ?? 0,
    recordDraw: input.recordDraw ?? 0,
    recordTotalBouts: input.recordTotalBouts,
  };
}

async function assertNoDuplicateManualApplication(input: {
  eventId: string;
  divisionId: string | null;
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

  const recordText = ctx.recordText?.trim() || null;
  const careerText = ctx.careerText?.trim() || null;
  const fighterSnapshot = {
    fighterId: ctx.fighter.id,
    fighterCode: ctx.fighter.fighterCode,
    name: ctx.fighter.name,
    gymName: ctx.gymDisplayName,
    profileImageUrl: profileUrl,
    recordSummary: formatRecordSummary(ctx.fighter),
    ...(recordText ? { recordText } : {}),
    ...(careerText ? { careerText } : {}),
    ...(ctx.applicationWeightKg != null
      ? { applicationWeightKg: ctx.applicationWeightKg }
      : {}),
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

  if (ctx.insurancePiiRequired !== false) {
    if (!ctx.insuranceRrnDigits?.trim()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "보험가입용 주민등록번호를 입력해 주세요.",
      );
    }
    if (!ctx.insuranceConsent) {
      throw new AppError(
        "VALIDATION_ERROR",
        "보험가입 개인정보 수집·이용 동의가 필요합니다.",
      );
    }
  }

  const rrnDigits = ctx.insuranceRrnDigits?.trim() || null;
  const encrypted = rrnDigits
    ? encryptInsuranceResidentNumber(rrnDigits)
    : null;

  const persist = async (client: Prisma.TransactionClient) =>
    applicationRepository.createEventApplicationWithPayment(
      {
        eventId: ctx.eventId,
        divisionId: ctx.divisionId,
        divisionSelectionType:
          ctx.divisionSelectionType ??
          (ctx.divisionId ? "REGISTERED" : "OTHER"),
        requestedDivisionText: ctx.requestedDivisionText ?? null,
        gymId: ctx.gymId,
        gymNameSnapshot: ctx.gymDisplayName.trim() || null,
        fighterId: ctx.fighter.id,
        fighterSnapshot,
        gymSnapshot,
        applicationAgreementSnapshot:
          applicationAgreementSnapshot as Prisma.InputJsonValue,
        appliedByUserId: ctx.appliedByUserId,
        appliedAt: ctx.appliedAt,
        applicationProfileImageUrl: profileUrl,
        memo: ctx.memo?.trim() || null,
        recordText,
        careerText,
        totalBoutsSnapshot:
          ctx.totalBoutsSnapshot ?? ctx.fighter.recordTotalBouts ?? null,
        winsSnapshot: ctx.winsSnapshot ?? null,
        drawsSnapshot: ctx.drawsSnapshot ?? null,
        lossesSnapshot: ctx.lossesSnapshot ?? null,
        schoolLevelSnapshot:
          ctx.schoolLevelSnapshot ?? ctx.fighter.schoolLevel ?? null,
        schoolGradeSnapshot:
          ctx.schoolGradeSnapshot ?? ctx.fighter.schoolGrade ?? null,
        insuranceRrnCipher: encrypted?.cipher ?? null,
        insuranceRrnIv: encrypted?.iv ?? null,
        insuranceRrnAuthTag: encrypted?.authTag ?? null,
        insuranceRrnKeyVer: encrypted?.keyVer ?? null,
        insuranceRrnMasked: encrypted?.masked ?? null,
        insuranceConsentSnapshot: ctx.insuranceConsent
          ? (ctx.insuranceConsent as Prisma.InputJsonValue)
          : undefined,
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
  recordText: string | null;
  careerText: string | null;
  insuranceRrnMasked: string | null;
  insuranceConsentLabel: string | null;
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
  /** REGISTERED면 division id, OTHER면 null */
  divisionId: string | null;
  divisionLabel: string;
  /**
   * 현재 배정 체급 (EventDivision). null이면 미배정.
   * divisionLabel과 다를 때만 UI에서 신청 체급/현재 배정으로 구분 표시.
   */
  currentDivisionLabel: string | null;
  /** 표시용 division 필드 — OTHER/미지정은 null. */
  division: EventDivisionDisplayInput | null;
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
  recordText: string | null;
  careerText: string | null;
  insuranceRrnMasked: string | null;
  insuranceConsentAgreed: boolean;
  insuranceConsentLabel: string;
  additionalInfoStatus: import("@/generated/prisma").AdditionalInfoStatus;
  additionalInfoLabel: string;
  additionalInfoBadgeTone: import("@/lib/additional-info/completion").AdditionalInfoBadgeTone;
  additionalInfoCompletedAt: string | null;
  contactMissing: boolean;
  additionalInfoContactCode:
    | "MISSING_ATHLETE_PHONE"
    | "MISSING_GUARDIAN_PHONE"
    | null;
  isMinor: boolean;
  divisionReviewRequired: boolean;
  /** OTHER 요청 원문 — 체급 지정 후에도 이력으로 유지 */
  requestedDivisionText: string | null;
  /** fighterSnapshot.applicationWeightKg */
  applicationWeightKg: number | null;
  /** 선수 성별 (male/female 등) — 체급 지정 UI·검증용 */
  fighterGender: string;
  /** 이벤트 내 active Match 배정 수 (복수 출전 포함) */
  assignmentCount: number;
  /** assignmentCount >= 1 */
  isAssigned: boolean;
};

export type ResolveOtherDivisionResultDTO = {
  applicationId: string;
  divisionId: string;
  divisionLabel: string;
  divisionSelectionType: "REGISTERED";
  divisionReviewRequired: false;
  requestedDivisionText: string | null;
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
  weightClassName: string | null;
  weightLimitText: string | null;
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
  gymId: string | null;
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
        divisionLabel: formatApplicationDivisionLabel({
          division: row.division,
          divisionSelectionType: row.divisionSelectionType,
          requestedDivisionText: row.requestedDivisionText,
        }),
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
        r.gymId
          ? gymEventFeeRepository.findByGymAndEvent(r.gymId, r.event.id)
          : Promise.resolve(null),
      ),
    );

    return rows.map((row, i) => ({
      id: row.id,
      eventId: row.event.id,
      eventTitle: row.event.title,
      eventSlug: row.event.publicSlug,
      eventStatus: row.event.status,
      divisionLabel: formatApplicationDivisionLabel({
        division: row.division,
        divisionSelectionType: row.divisionSelectionType,
        requestedDivisionText: row.requestedDivisionText,
      }),
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

    const insuranceConsent = readInsuranceConsentSnapshot(
      row.insuranceConsentSnapshot,
    );
    return {
      eventTitle: row.event.title,
      fighterName,
      gymName,
      divisionLabel: formatApplicationDivisionLabel({
        division: row.division,
        divisionSelectionType: row.divisionSelectionType,
        requestedDivisionText: row.requestedDivisionText,
      }),
      applicationStatus: row.status,
      paymentStatus: row.paymentStatus,
      appliedAt: row.appliedAt ? toIso(row.appliedAt) : toIso(row.createdAt),
      recordText: row.recordText ?? null,
      careerText: row.careerText ?? null,
      insuranceRrnMasked: row.insuranceRrnMasked ?? null,
      insuranceConsentLabel: insuranceConsentDisplayLabel(insuranceConsent),
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

    const [rows, matchSlots] = await Promise.all([
      applicationRepository.listApplicationsForOrganizerEvent(eventId),
      bracketRepository.listActiveMatchFighterSlotsForEvent(eventId),
    ]);
    const assignmentCounts = buildApplicantAssignmentCountMap(matchSlots);

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

      const gymName = resolveApplicationGymDisplayName({
        gymNameSnapshot: row.gymNameSnapshot,
        gymSnapshot: row.gymSnapshot,
        gymRelationName: row.gym?.name,
      });
      const summary = consentSummaryFields(policyRequires, consent);

      results.push({
        applicationId: row.id,
        fighterId: row.fighter.id,
        fighterSnapshot: snap,
        fighterProfileImageUrl,
        fighterName,
        gymId: row.gym?.id ?? "",
        gymName,
        divisionId: row.divisionId ?? null,
        divisionLabel: formatApplicationDivisionLabel({
          division: row.division,
          divisionSelectionType: row.divisionSelectionType,
          requestedDivisionText: row.requestedDivisionText,
        }),
        currentDivisionLabel: row.division
          ? formatDivisionLabel(row.division)
          : null,
        division: row.division
          ? {
              sportType: row.division.sportType,
              ruleType: row.division.ruleType,
              gender: row.division.gender,
              ageGroup: row.division.ageGroup,
              weightClass: row.division.weightClass,
              weightClassName: row.division.weightClassName ?? null,
              weightLimitText: row.division.weightLimitText ?? null,
              skillLevel: row.division.skillLevel,
            }
          : null,
        requestedDivisionText: row.requestedDivisionText ?? null,
        applicationWeightKg:
          typeof snap.applicationWeightKg === "number" &&
          Number.isFinite(snap.applicationWeightKg)
            ? snap.applicationWeightKg
            : null,
        fighterGender: row.fighter.gender,
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
        recordText: row.recordText ?? null,
        careerText: row.careerText ?? null,
        insuranceRrnMasked: row.insuranceRrnMasked ?? null,
        insuranceConsentAgreed:
          readInsuranceConsentSnapshot(row.insuranceConsentSnapshot) != null,
        insuranceConsentLabel: insuranceConsentDisplayLabel(
          readInsuranceConsentSnapshot(row.insuranceConsentSnapshot),
        ),
        ...(() => {
          const mapped = additionalInfoService.mapRowFields({
            additionalInfoStatus: row.additionalInfoStatus,
            additionalInfoCompletedAt: row.additionalInfoCompletedAt,
            additionalInfoRecipientPhone: row.additionalInfoRecipientPhone,
            additionalInfoRecipientMasked: row.additionalInfoRecipientMasked,
            divisionSelectionType: row.divisionSelectionType,
            fighter: {
              birthDate: row.fighter.birthDate,
              phone: row.fighter.phone,
              guardianPhone: row.fighter.guardianPhone,
            },
          });
          const isMinor = row.fighter.birthDate
            ? isMinorBirthDate(row.fighter.birthDate)
            : false;
          const assignmentCount = resolveApplicantAssignmentCount(
            assignmentCounts,
            row.fighter.id,
          );
          return {
            ...mapped,
            isMinor,
            assignmentCount,
            isAssigned: assignmentCount >= 1,
          };
        })(),
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
      if (app.divisionId) list.push(app.divisionId);
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
        birthDate: f.birthDate ? toIso(f.birthDate) : "",
        ageGroup: publicAgeGroupFromBirthDate(f.birthDate) ?? "",
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
      divisions: event.divisions.map((d) => toApplicationDivisionRow(d)),
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

    const { division, applicationWeightKg, category } =
      resolveDivisionForApplicationWeight({
        gender: fighter.gender,
        competitionCategory: input.competitionCategory,
        discipline: input.discipline,
        applicationWeightKg: input.applicationWeightKg,
        divisions: event.divisions,
      });

    const existing = await applicationRepository.findExistingApplication(
      input.eventId,
      fighter.id,
      division.id,
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

    const schoolGradeResolved = resolveGymApplySchoolGradeSnapshot({
      schoolGradeSelect: input.schoolGradeSelect,
      fighterSchoolLevel: fighter.schoolLevel,
      fighterSchoolGrade: fighter.schoolGrade,
      categorySchoolLevel: category.schoolLevel,
      categorySchoolGrade: category.schoolGrade,
    });
    if (!schoolGradeResolved.ok) {
      throw new AppError("VALIDATION_ERROR", schoolGradeResolved.error);
    }

    const fighterRecordDetails = nullableDetailsFromFighterCache(fighter);
    const { applicationId } = await createGymEventApplication({
      eventId: input.eventId,
      divisionId: division.id,
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
      recordText: input.recordText,
      careerText: input.careerText,
      totalBoutsSnapshot: fighter.recordTotalBouts ?? null,
      winsSnapshot: fighterRecordDetails.wins,
      drawsSnapshot: fighterRecordDetails.draws,
      lossesSnapshot: fighterRecordDetails.losses,
      schoolLevelSnapshot: schoolGradeResolved.fields.schoolLevel,
      schoolGradeSnapshot: schoolGradeResolved.fields.schoolGrade,
      applicationWeightKg,
      insuranceRrnDigits: input.residentRegistrationNumber,
      insuranceConsent: buildInsuranceConsentSnapshot({
        agreedAt: appliedAt,
        appliedByUserId: actor.userId,
        provenance: "gym_operator_attested",
      }),
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
      const fighter = await fighterRepository.findFighterForGymApplication(
        row.fighterId,
        gymId,
      );
      if (!fighter || fighter.status !== FighterStatus.active) {
        items.push({
          fighterId: row.fighterId,
          fighterName,
          divisionId: "",
          outcome: "failed",
          message: "신청할 수 있는 소속 선수가 아닙니다.",
        });
        failedCount += 1;
        continue;
      }

      let resolved;
      try {
        resolved = resolveDivisionForApplicationWeight({
          gender: fighter.gender,
          competitionCategory: row.competitionCategory,
          discipline: row.discipline,
          applicationWeightKg: row.applicationWeightKg,
          divisions: event.divisions,
        });
      } catch (e) {
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId: "",
          outcome: "failed",
          message: e instanceof AppError ? e.message : "체급 자동배정에 실패했습니다.",
        });
        failedCount += 1;
        continue;
      }
      const divisionId = resolved.division.id;
      const dedupeKey = `${row.fighterId}:${divisionId}`;

      if (seenKeys.has(dedupeKey)) {
        items.push({
          fighterId: row.fighterId,
          fighterName,
          divisionId,
          outcome: "skipped",
          message: "요청 목록에 중복된 선수·경기구분 조합이 있습니다.",
        });
        skippedCount += 1;
        continue;
      }
      seenKeys.add(dedupeKey);

      const existing = await applicationRepository.findExistingApplication(
        input.eventId,
        fighter.id,
        divisionId,
      );
      if (existing) {
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId,
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
            divisionId,
            outcome: "failed",
            message: formError,
          });
          failedCount += 1;
          continue;
        }
        const division = divisionById.get(divisionId);
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
        const schoolGradeResolved = resolveGymApplySchoolGradeSnapshot({
          schoolGradeSelect: row.schoolGradeSelect,
          fighterSchoolLevel: fighter.schoolLevel,
          fighterSchoolGrade: fighter.schoolGrade,
          categorySchoolLevel: resolved.category.schoolLevel,
          categorySchoolGrade: resolved.category.schoolGrade,
        });
        if (!schoolGradeResolved.ok) {
          throw new AppError("VALIDATION_ERROR", schoolGradeResolved.error);
        }

        const { applicationId } = await createGymEventApplication({
          eventId: input.eventId,
          divisionId,
          gymId,
          gymDisplayName,
          fighter,
          agreements: input.agreements,
          streamingAgreementRequired,
          appliedByUserId: actor.userId,
          appliedAt,
          feeAmount,
          memo: input.memo,
          recordText: row.recordText,
          careerText: row.careerText,
          schoolLevelSnapshot: schoolGradeResolved.fields.schoolLevel,
          schoolGradeSnapshot: schoolGradeResolved.fields.schoolGrade,
          applicationWeightKg: resolved.applicationWeightKg,
          insuranceRrnDigits: row.residentRegistrationNumber,
          insuranceConsent: buildInsuranceConsentSnapshot({
            agreedAt: appliedAt,
            appliedByUserId: actor.userId,
            provenance: "gym_operator_attested",
          }),
          customFormSnapshot,
        });
        items.push({
          fighterId: row.fighterId,
          fighterName: fighter.name,
          divisionId,
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
          divisionId,
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
      const gymOwnerUserId = nctxApproved.gym.ownerUserId;
      const fighterUserId = nctxApproved.fighter.userId;
      safeNotify(`application-approved:${applicationId}`, () =>
        notificationService.notifyApplicationStatusChanged({
          applicationId,
          eventId: nctxApproved.eventId,
          eventTitle: nctxApproved.event.title,
          status: ApplicationStatus.approved,
          gymOwnerUserId,
          fighterUserId,
        }),
      );
    }

    // MVP: 입금 미확인(unpaid)이어도 승인 가능 — 향후 대회별 "입금 확인 후 승인" 정책 확장 TODO.
    void ctx.paymentStatus;
  },

  /** 승인(approved) → 미승인(pending). 입금 상태는 변경하지 않음. */
  async revokeEventApplicationApproval(
    actor: ActorContext,
    applicationId: string,
  ): Promise<void> {
    const ctx =
      await applicationRepository.findApplicationOwnershipContext(applicationId);
    if (!ctx) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }
    await requireOrganizerForEvent(actor, ctx.eventId);

    if (ctx.status !== ApplicationStatus.approved) {
      throw new AppError(
        "CONFLICT",
        "승인된 신청만 승인 취소할 수 있습니다.",
      );
    }

    const fighterId = ctx.fighterId;
    const eventId = ctx.eventId;

    const [matches, results, appRow] = await Promise.all([
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
        select: { weighInStatus: true, weighInWeightKg: true },
      }),
    ]);

    if (matches > 0) {
      throw new AppError(
        "CONFLICT",
        "대진 배정된 선수는 승인을 취소할 수 없습니다.",
      );
    }
    if (results > 0) {
      throw new AppError(
        "CONFLICT",
        "경기 결과가 있는 선수는 승인을 취소할 수 없습니다.",
      );
    }
    if (
      appRow &&
      (appRow.weighInStatus !== WeighInStatus.pending ||
        appRow.weighInWeightKg != null)
    ) {
      throw new AppError(
        "CONFLICT",
        "계체 기록이 있는 선수는 승인을 취소할 수 없습니다.",
      );
    }

    const organizerId = ctx.event.organizerId;

    await prisma.$transaction(async (tx) => {
      await creditService.refundParticipantFee(
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
        ApplicationStatus.pending,
        tx,
      );
    });

    const nctxRevoked =
      await applicationRepository.findApplicationNotificationContext(
        applicationId,
      );
    if (nctxRevoked?.event && nctxRevoked.gym && nctxRevoked.fighter) {
      const gymOwnerUserId = nctxRevoked.gym.ownerUserId;
      const fighterUserId = nctxRevoked.fighter.userId;
      safeNotify(`application-revoked:${applicationId}`, () =>
        notificationService.notifyApplicationStatusChanged({
          applicationId,
          eventId: nctxRevoked.eventId,
          eventTitle: nctxRevoked.event.title,
          status: ApplicationStatus.pending,
          gymOwnerUserId,
          fighterUserId,
        }),
      );
    }

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
      const gymOwnerUserId = nctxRejected.gym.ownerUserId;
      const fighterUserId = nctxRejected.fighter.userId;
      safeNotify(`application-rejected:${applicationId}`, () =>
        notificationService.notifyApplicationStatusChanged({
          applicationId,
          eventId: nctxRejected.eventId,
          eventTitle: nctxRejected.event.title,
          status: ApplicationStatus.rejected,
          gymOwnerUserId,
          fighterUserId,
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
      divisions: event.divisions.map((d) => toApplicationDivisionRow(d)),
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

      let division = event.divisions.find((d) => d.id === input.divisionId);
      let applicationWeightKg: number;
      let category: ReturnType<
        typeof resolveDivisionForApplicationWeight
      >["category"] | null = null;
      if (input.manualDivisionOverride) {
        const parsedWeight = parseApplicationWeightKg(input.applicationWeightKg);
        if (!parsedWeight.ok) {
          throw new AppError("VALIDATION_ERROR", parsedWeight.error);
        }
        if (!input.divisionId?.trim()) {
          throw new AppError("VALIDATION_ERROR", "체급을 선택해 주세요.");
        }
        if (!division) {
          throw new AppError("NOT_FOUND", "유효하지 않은 경기구분/체급입니다.");
        }
        assertApplicationDivisionCompatible({
          fighterGender: input.gender,
          competitionCategory: input.competitionCategory,
          discipline: input.discipline,
          division,
        });
        applicationWeightKg = parsedWeight.kg;
      } else {
        const auto = resolveDivisionForApplicationWeight({
          gender: input.gender,
          competitionCategory: input.competitionCategory,
          discipline: input.discipline,
          applicationWeightKg: input.applicationWeightKg,
          divisions: event.divisions,
        });
        division = auto.division;
        applicationWeightKg = auto.applicationWeightKg;
        category = auto.category;
      }
      if (!division) {
        throw new AppError("NOT_FOUND", "유효하지 않은 경기구분/체급입니다.");
      }
      logManualApplicationCreate("division_resolved", {
        ...logBase,
        divisionLabel: formatDivisionLabel(division),
      });

      const phone = normalizeGymFighterPhone(input.phone) || "-";
      const birthDate = input.birthDate ? toUtcDateOnly(input.birthDate) : null;

      const schoolGradeParsed = parseSchoolGradeSelectValue(
        input.schoolGradeSelect,
      );
      if (!schoolGradeParsed.ok) {
        throw new AppError("VALIDATION_ERROR", schoolGradeParsed.error);
      }
      const schoolFields = schoolGradeParsed.fields;

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
          divisionId: division.id,
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
        let gymId: string | null = null;
        let gymDisplayName: string;
        if (input.gymMode === "existing") {
          const row = await gymRepository.findActiveGymById(input.gymId!, tx);
          if (!row) {
            throw new AppError("VALIDATION_ERROR", "체육관을 찾을 수 없습니다.");
          }
          gymId = row.id;
          gymDisplayName = row.name;
        } else {
          // 미가입 소속명 — Gym/User/loginId 생성 금지
          gymDisplayName = (input.gymName ?? "").trim();
          if (!gymDisplayName) {
            throw new AppError("VALIDATION_ERROR", "체육관명을 입력해 주세요.");
          }
          gymId = null;
        }
        logManualApplicationCreate("gym_resolved", {
          ...logBase,
          gymId,
          gymCreated: false,
          affiliationOnly: gymId == null,
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
          if (gymId) {
            await fighterRepository.linkExistingFighterToGym(tx, {
              fighterId: linked.id,
              gymId,
              gymInternalMemo: null,
            });
          }
          await fighterRepository.updateFighterProfile(tx, linked.id, {
            name: input.fighterName.trim(),
            birthDate,
            gender: input.gender,
            phone,
            guardianName: input.guardianName ?? null,
            guardianPhone: input.guardianPhone ?? null,
            status: FighterStatus.active,
            schoolLevel: schoolFields.schoolLevel,
            schoolGrade: schoolFields.schoolGrade,
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
              currentGymId: gymId,
              schoolLevel: schoolFields.schoolLevel,
              schoolGrade: schoolFields.schoolGrade,
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
          divisionId: division.id,
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
              gymName: gymDisplayName,
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
            divisionId: division.id,
            gymId,
            gymDisplayName,
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
            recordText: input.recordText,
            careerText: input.careerText,
            schoolLevelSnapshot: schoolFields.schoolLevel,
            schoolGradeSnapshot: schoolFields.schoolGrade,
            applicationWeightKg,
            insuranceRrnDigits: input.residentRegistrationNumber,
            insuranceConsent: input.insuranceConsentConfirmed
              ? buildInsuranceConsentSnapshot({
                  agreedAt: appliedAt,
                  appliedByUserId: actor.userId,
                  provenance: "organizer_confirmed",
                })
              : undefined,
            insurancePiiRequired: false,
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
          gymId,
        });

        await appendApplicationStructuralAudit(tx, {
          actorUserId: actor.userId,
          eventId: input.eventId,
          applicationId,
          fighterId: fighter.id,
          source: "ORGANIZER_APPLICATION_CREATE",
          before: { divisionId: null, gender: null },
          after: { divisionId: division.id, gender: input.gender },
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
          gymId,
          fighterName: fighter.name,
          gymName: gymDisplayName,
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
      divisionId: string | null;
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

    assertExternalRegistrationEligible(link.event);

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
          divisionId: null,
        })),
        idempotentReplay: true,
      };
    }

    const divisionById = new Map(link.event.divisions.map((d) => [d.id, d]));
    const divisionCandidates = link.event.divisions.map((d) => ({
      id: d.id,
      sportType: d.sportType,
      ruleType: d.ruleType,
      gender: d.gender,
      ageGroup: d.ageGroup,
      weightClass: d.weightClass,
      weightClassName: d.weightClassName,
      weightLimitText: d.weightLimitText,
      skillLevel: d.skillLevel,
    }));

    const resolvedAthletes = input.athletes.map((athlete, i) => {
      const firstStage = validateFirstStageApplication({
        gymName: input.gymInfo.gymName,
        fighterName: athlete.fighterName,
        gender: athlete.gender,
        birthDate: athlete.birthDate,
        phone: athlete.phone,
        guardianName: athlete.guardianName,
        guardianPhone: athlete.guardianPhone,
        competitionCategory: athlete.competitionCategory,
        divisionSelection: athlete.divisionSelection,
        record: athlete.structuredRecord,
        applicationWeightKg: athlete.applicationWeightKg,
        careerText: athlete.careerText,
        memo: athlete.memo,
        divisions: divisionCandidates,
      });
      if (!firstStage.ok) {
        throw new AppError(
          "VALIDATION_ERROR",
          `${i + 1}번 선수: ${firstStage.errors[0] ?? "입력값을 확인해 주세요."}`,
        );
      }
      return { athlete, validated: firstStage.value };
    });

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

    const result = await prisma.$transaction(
      async (tx) => {
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
            divisionId: string | null;
          }>,
          idempotentReplay: true,
        };
      }

      // 외부 소속명만 저장 — MATCHON Gym/User/loginId 생성 금지
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
        divisionId: string | null;
      }> = [];

      for (const { athlete, validated } of resolvedAthletes) {
        const isOther = validated.selection.selectionType === "OTHER";
        const divisionId = isOther ? null : validated.selection.divisionId;
        const division = divisionId ? divisionById.get(divisionId) : undefined;
        if (!isOther && !division) {
          throw new AppError("VALIDATION_ERROR", "유효하지 않은 체급입니다.");
        }

        const phone = normalizeGymFighterPhone(validated.phone);
        if (!phone) {
          throw new AppError("VALIDATION_ERROR", "연락처를 입력해 주세요.");
        }
        const birthDate = fighterBirthDateForPersist(validated.birthDateIso);
        if (!birthDate) {
          throw new AppError(
            "VALIDATION_ERROR",
            "생년월일 형식이 올바르지 않습니다.",
          );
        }

        const schoolGradeParsed = parseSchoolGradeSelectValue(
          athlete.schoolGradeSelect,
        );
        if (!schoolGradeParsed.ok) {
          throw new AppError("VALIDATION_ERROR", schoolGradeParsed.error);
        }
        const schoolFields = schoolGradeParsed.fields;

        const fighterCode = await fighterService.generateFighterCode(tx);
        const createdFighter = await fighterRepository.createFighterWithGymHistory(
          tx,
          {
            fighterCode,
            name: validated.fighterName,
            birthDate,
            gender: validated.gender,
            phone,
            guardianName: validated.guardianName,
            guardianPhone: validated.guardianPhone,
            currentGymId: null,
            weight: validated.applicationWeightKg,
            schoolLevel: schoolFields.schoolLevel,
            schoolGrade: schoolFields.schoolGrade,
          },
        );
        const fighter = buildFighterForManualApplication({
          id: createdFighter.id,
          fighterCode: createdFighter.fighterCode,
          name: validated.fighterName,
        });

        await assertNoDuplicateManualApplication({
          eventId: link.eventId,
          divisionId,
          fighterIds: [fighter.id],
          tx,
        });

        const divisionLabel = isOther
          ? `기타 · ${validated.selection.requestedDivisionText}`
          : formatDivisionLabel(division!);

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
              divisionLabel,
              division: {
                sportType: division?.sportType ?? null,
                gender: division?.gender ?? validated.gender,
                ageGroup:
                  division?.ageGroup ??
                  (validated.competitionCategory || null),
                weightClass: division?.weightClass ?? null,
              },
              fighter: {
                name: fighter.name,
                gender: validated.gender,
                birthDate,
                weightKg: validated.applicationWeightKg,
                primarySport: null,
                guardianName: validated.guardianName,
                guardianPhone: validated.guardianPhone,
              },
            },
            {
              templateId: link.event.applicationFormTemplate.id,
              templateTitle: link.event.applicationFormTemplate.title,
              capturedAt: appliedAt.toISOString(),
            },
          );
        }

        const memoParts = [`[외부링크 등록] ${input.gymInfo.gymName}`];
        if (isOther) {
          memoParts.push(
            `체급 확인 필요 · 기타: ${validated.selection.requestedDivisionText}`,
          );
        }
        if (input.gymInfo.memo?.trim()) memoParts.push(input.gymInfo.memo.trim());
        if (validated.memo) memoParts.push(validated.memo);

        const { applicationId } = await createGymEventApplication(
          {
            eventId: link.eventId,
            divisionId,
            divisionSelectionType: isOther ? "OTHER" : "REGISTERED",
            requestedDivisionText: isOther
              ? validated.selection.requestedDivisionText
              : null,
            gymId: null,
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
            recordText: validated.recordText,
            careerText: validated.careerText,
            totalBoutsSnapshot: validated.record.totalBouts,
            winsSnapshot: validated.record.wins,
            drawsSnapshot: validated.record.draws,
            lossesSnapshot: validated.record.losses,
            schoolLevelSnapshot: schoolFields.schoolLevel,
            schoolGradeSnapshot: schoolFields.schoolGrade,
            applicationWeightKg: validated.applicationWeightKg,
            insuranceRrnDigits: undefined,
            insuranceConsent: undefined,
            insurancePiiRequired: false,
            customFormSnapshot,
            applicationEntryExtras: {
              ...entryExtras,
              entryStage: "first_stage",
              divisionSelectionType: isOther ? "OTHER" : "REGISTERED",
              requestedDivisionText: isOther
                ? validated.selection.requestedDivisionText
                : undefined,
              reviewRequired: isOther,
            },
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
          divisionId,
        });
      }

      const submission = await tx.eventExternalRegistrationSubmission.create({
        data: {
          linkId: link.id,
          clientSubmissionId: input.clientSubmissionId,
          athleteCount: created.length,
          gymNameSnapshot: input.gymInfo.gymName,
          contactNameSnapshot: input.gymInfo.contactName ?? null,
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
      },
      {
        // 최대 50명 batch + credit debit — remote DB에서 기본 5s 부족
        maxWait: 15_000,
        timeout: 120_000,
      },
    );

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

  async buildOrganizerApplicantExcelSample(
    actor: ActorContext,
    eventId: string,
  ): Promise<{ filename: string; base64: string }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const event =
      await eventRepository.findEventWithDivisionsForApplication(eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    const wb = await buildApplicantExcelSampleWorkbook({
      eventTitle: event.title,
      divisions: event.divisions.map((d) => ({ ...d, id: d.id })),
    });
    const buffer = await workbookToBuffer(wb);
    return {
      filename: "MATCHON_선수신청_업로드_샘플.xlsx",
      base64: buffer.toString("base64"),
    };
  },

  async analyzeOrganizerApplicantExcel(
    actor: ActorContext,
    input: { eventId: string; fileName: string; buffer: Buffer },
  ): Promise<ApplicantExcelPreview> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);
    if (input.buffer.byteLength > APPLICANT_EXCEL_MAX_BYTES) {
      throw new AppError("VALIDATION_ERROR", "파일이 너무 큽니다. 2MB 이하로 올려 주세요.");
    }
    const event =
      await eventRepository.findEventWithDivisionsForApplication(input.eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    const parsed = await parseApplicantExcelWorkbook(input.buffer).catch(
      (e: unknown) => {
        throw new AppError(
          "VALIDATION_ERROR",
          e instanceof Error ? e.message : "Excel을 읽지 못했습니다.",
        );
      },
    );
    const existingRows =
      await applicationRepository.listImportIdentitiesForEvent(input.eventId);
    return analyzeApplicantExcelRows({
      fileName: input.fileName,
      headerRow: parsed.headerRow,
      rows: parsed.rows,
      presentHeaders: parsed.presentHeaders,
      divisions: event.divisions,
      existing: existingRows.map(identityFromExistingApplication),
    });
  },

  async commitOrganizerApplicantExcel(
    actor: ActorContext,
    input: { eventId: string; fileName: string; buffer: Buffer },
  ): Promise<ApplicantExcelCommitResult> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);
    const preview = await applicationService.analyzeOrganizerApplicantExcel(
      actor,
      input,
    );
    try {
      assertPreviewReadyToCommit(preview);
    } catch (e) {
      throw new AppError(
        "VALIDATION_ERROR",
        e instanceof Error ? e.message : "오류 행이 있어 등록할 수 없습니다.",
      );
    }

    const createRows = preview.rows.filter((r) => r.decision === "create");
    if (createRows.length === 0) {
      return {
        created: 0,
        skipped: preview.counts.skipExisting,
        failed: 0,
        applicationIds: [],
      };
    }

    const event =
      await eventRepository.findEventWithDivisionsForApplication(input.eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }

    const paymentSetting = await eventRepository.findEventPaymentSettingFull(
      input.eventId,
    );
    const feeAmount = paymentSetting?.feeAmount ?? 0;
    const appliedAt = new Date();
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
    const divisionById = new Map(event.divisions.map((d) => [d.id, d]));

    const result = await prisma.$transaction(
      async (tx) => {
        // Excel 소속명만 저장 — MATCHON Gym/User 생성 금지
        const createdIds: string[] = [];

        for (const row of createRows) {
          if (!row.gender) {
            throw new AppError("VALIDATION_ERROR", `${row.excelRow}행 데이터가 올바르지 않습니다.`);
          }
          const isOther =
            row.divisionSelectionType === "OTHER" || !row.divisionId;
          const division = row.divisionId
            ? divisionById.get(row.divisionId)
            : undefined;
          if (!isOther && !division) {
            throw new AppError(
              "VALIDATION_ERROR",
              `${row.excelRow}행: 유효하지 않은 체급입니다.`,
            );
          }
          if (isOther && !row.requestedDivisionText?.trim()) {
            throw new AppError(
              "VALIDATION_ERROR",
              `${row.excelRow}행: 기타를 선택한 경우 체급 또는 요청사항을 입력해주세요.`,
            );
          }

          const phone = normalizeGymFighterPhone(row.phone);
          if (!phone) {
            throw new AppError(
              "VALIDATION_ERROR",
              `${row.excelRow}행: 연락처를 입력해 주세요.`,
            );
          }
          const birthDate = fighterBirthDateForPersist(row.birthDate || null);
          if (!birthDate) {
            throw new AppError(
              "VALIDATION_ERROR",
              `${row.excelRow}행: 생년월일을 입력해 주세요.`,
            );
          }
          const fighterCode = await fighterService.generateFighterCode(tx);
          const createdFighter =
            await fighterRepository.createFighterWithGymHistory(tx, {
              fighterCode,
              name: row.fighterName,
              birthDate,
              gender: row.gender,
              phone,
              height: row.heightCm,
              weight: row.applicationWeightKg ?? row.weightKg,
              guardianName: row.guardianName || null,
              guardianPhone: row.guardianPhone || null,
              currentGymId: null,
              recordTotalBouts: row.totalBoutsSnapshot ?? 0,
              recordWin: row.winsSnapshot ?? 0,
              recordDraw: row.drawsSnapshot ?? 0,
              recordLoss: row.lossesSnapshot ?? 0,
              recordText: row.recordText || null,
            });
          const fighter = buildFighterForManualApplication({
            id: createdFighter.id,
            fighterCode: createdFighter.fighterCode,
            name: row.fighterName,
            recordWin: row.winsSnapshot ?? 0,
            recordLoss: row.lossesSnapshot ?? 0,
            recordDraw: row.drawsSnapshot ?? 0,
            recordTotalBouts: row.totalBoutsSnapshot ?? 0,
          });

          await assertNoDuplicateManualApplication({
            eventId: input.eventId,
            divisionId: isOther ? null : row.divisionId,
            fighterIds: [fighter.id],
            tx,
          });

          const divisionLabel = isOther
            ? `기타 · ${row.requestedDivisionText}`
            : formatDivisionSearchLabel(division!);

          let customFormSnapshot: CustomFormSnapshot | null = null;
          if (
            applicationFormMode === "custom" &&
            manualConfig.fields.length > 0 &&
            event.applicationFormTemplate
          ) {
            const answers = buildOrganizerManualCustomFormAnswers(
              manualConfig.fields,
              "엑셀 일괄 등록",
            );
            customFormSnapshot = buildCustomFormSnapshot(
              manualConfig.fields,
              answers,
              {
                eventTitle: event.title,
                gymName: row.gymName,
                divisionLabel,
                division: division
                  ? {
                      sportType: division.sportType,
                      gender: division.gender,
                      ageGroup: division.ageGroup,
                      weightClass: division.weightClass,
                    }
                  : {
                      sportType: null,
                      gender: row.gender,
                      ageGroup: row.ageGroup || null,
                      weightClass: null,
                    },
                fighter: {
                  name: fighter.name,
                  gender: row.gender,
                  birthDate,
                  weightKg: row.applicationWeightKg ?? row.weightKg,
                  primarySport: null,
                  guardianName: row.guardianName || null,
                  guardianPhone: row.guardianPhone || null,
                },
              },
              {
                templateId: event.applicationFormTemplate.id,
                templateTitle: event.applicationFormTemplate.title,
                capturedAt: appliedAt.toISOString(),
              },
            );
          }

          const memoParts = [`[엑셀 일괄 등록] ${row.gymName}`];
          if (isOther) {
            memoParts.push(`체급 확인 필요 · 기타: ${row.requestedDivisionText}`);
          }
          if (row.applicationWeightKg != null || row.weightKg != null) {
            memoParts.push(
              `신청체중 ${row.applicationWeightKg ?? row.weightKg}kg`,
            );
          }
          if (row.heightCm != null) memoParts.push(`키 ${row.heightCm}cm`);
          if (row.recordText) memoParts.push(`전적 ${row.recordText}`);
          if (row.careerText) memoParts.push(`운동경력 ${row.careerText}`);
          if (row.memo) memoParts.push(row.memo);

          const { applicationId } = await createGymEventApplication(
            {
              eventId: input.eventId,
              divisionId: isOther ? null : row.divisionId,
              divisionSelectionType: isOther ? "OTHER" : "REGISTERED",
              requestedDivisionText: isOther
                ? row.requestedDivisionText
                : null,
              gymId: null,
              gymDisplayName: row.gymName,
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
              recordText: row.recordText || null,
              careerText: row.careerText || null,
              totalBoutsSnapshot: row.totalBoutsSnapshot,
              winsSnapshot: row.winsSnapshot,
              drawsSnapshot: row.drawsSnapshot,
              lossesSnapshot: row.lossesSnapshot,
              schoolLevelSnapshot: row.schoolLevelSnapshot,
              schoolGradeSnapshot: row.schoolGradeSnapshot,
              applicationWeightKg: row.applicationWeightKg ?? row.weightKg,
              insuranceRrnDigits: undefined,
              insuranceConsent: undefined,
              insurancePiiRequired: false,
              customFormSnapshot,
              organizerManualEntry: {
                manualCreatedByUserId: actor.userId,
              },
              applicationEntryExtras: {
                importChannel: "excel",
                entryStage: "first_stage",
                excelFileName: compactText(input.fileName),
                excelRow: row.excelRow,
                importRowNumber: row.rowNumber || undefined,
                importAgeNote: row.ageNote || undefined,
                importHeightCm: row.heightCm ?? undefined,
                importRecordText: row.recordText || undefined,
                importCareerText: row.careerText || undefined,
                divisionSelectionType: isOther ? "OTHER" : "REGISTERED",
                requestedDivisionText: isOther
                  ? row.requestedDivisionText
                  : undefined,
                reviewRequired: isOther,
              },
              initialApplicationStatus: ApplicationStatus.approved,
              initialPaymentStatus: PaymentStatus.unpaid,
            },
            tx,
          );

          await creditService.debitParticipantFee(
            {
              organizerId: event.organizerId,
              eventId: input.eventId,
              eventApplicationId: applicationId,
              actor,
            },
            tx,
          );
          createdIds.push(applicationId);
        }

        return createdIds;
      },
      { maxWait: 15_000, timeout: 120_000 },
    );

    safeNotify(`application-excel-batch:${input.eventId}:${result[0] ?? "none"}`, () =>
      notificationService.notifyApplicationSubmitted({
        eventId: input.eventId,
        eventTitle: event.title,
        count: result.length,
      }),
    );

    return {
      created: result.length,
      skipped: preview.counts.skipExisting,
      failed: 0,
      applicationIds: result,
    };
  },

  /**
   * OTHER(divisionId null) 신청을 실제 EventDivision에 지정한다.
   * requestedDivisionText는 이력으로 유지한다.
   */
  async resolveOtherDivisionApplication(
    actor: ActorContext,
    input: { applicationId: string; eventDivisionId: string },
  ): Promise<ResolveOtherDivisionResultDTO> {
    const row =
      await applicationRepository.findApplicationForOtherDivisionResolve(
        input.applicationId,
      );
    if (!row) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }

    await requireOrganizerForEvent(actor, row.eventId);

    const isOtherSelection = row.divisionSelectionType === "OTHER";
    const hasNullDivision = row.divisionId == null;
    const hasRequestedText = Boolean(row.requestedDivisionText?.trim());
    if (!isOtherSelection && !hasNullDivision && !hasRequestedText) {
      throw new AppError(
        "VALIDATION_ERROR",
        "기타(체급 미지정) 신청만 체급을 지정할 수 있습니다.",
      );
    }

    const division = await eventRepository.findEventDivisionById(
      input.eventDivisionId,
    );
    if (!division || division.eventId !== row.eventId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이 대회의 체급만 지정할 수 있습니다.",
      );
    }

    if (!divisionGenderAllowsFighter(division.gender, row.fighter.gender)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선수 성별과 선택한 체급 성별이 일치하지 않습니다.",
      );
    }

    if (row.divisionId !== division.id) {
      const duplicate = await applicationRepository.findExistingApplication(
        row.eventId,
        row.fighterId,
        division.id,
      );
      if (duplicate && duplicate.id !== row.id) {
        throw new AppError(
          "CONFLICT",
          "동일 선수·체급 신청이 이미 존재합니다.",
        );
      }
    }

    await applicationRepository.patchApplication(row.id, {
      division: { connect: { id: division.id } },
      divisionSelectionType: "REGISTERED",
    });

    return {
      applicationId: row.id,
      divisionId: division.id,
      divisionLabel: formatDivisionLabel(division),
      divisionSelectionType: "REGISTERED",
      divisionReviewRequired: false,
      requestedDivisionText: row.requestedDivisionText ?? null,
    };
  },
};
