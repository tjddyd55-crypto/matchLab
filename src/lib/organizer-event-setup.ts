import type { ApplicationFormMode } from "@/lib/application-form/custom-form";
import { EventStatus } from "@/lib/enums";

export type SetupStepStatus = "complete" | "needed" | "recommended" | "review";

export type SetupStepId =
  | "basic_info"
  | "poster_public"
  | "divisions"
  | "application_form"
  | "payment"
  | "pre_publish";

export type EventSetupInput = {
  eventId: string;
  publicSlug: string;
  title: string;
  description: string | null;
  location: string | null;
  roadAddress: string | null;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  posterUrl: string | null;
  galleryImageCount: number;
  divisionCount: number;
  applicationFormMode: ApplicationFormMode;
  applicationFormConfigured: boolean;
  paymentConfigured: boolean;
};

export type EventSetupStep = {
  id: SetupStepId;
  order: number;
  title: string;
  description: string;
  status: SetupStepStatus;
  statusLabel: string;
  href: string;
  actionLabel: string;
  importance: "required" | "recommended";
};

export type EventSetupNextAction = {
  stepId: SetupStepId;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export type EventSetupChecklist = {
  steps: EventSetupStep[];
  completionRate: number;
  requiredDone: number;
  requiredTotal: number;
  nextActions: EventSetupNextAction[];
};

const STATUS_LABEL: Record<SetupStepStatus, string> = {
  complete: "완료",
  needed: "필요",
  recommended: "권장",
  review: "확인 필요",
};

function hasVenue(input: EventSetupInput): boolean {
  return Boolean(
    input.location?.trim() || input.roadAddress?.trim(),
  );
}

function hasRegistrationPeriod(input: EventSetupInput): boolean {
  const start = new Date(input.registrationStartDate);
  const end = new Date(input.registrationEndDate);
  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end.getTime() >= start.getTime()
  );
}

function isBasicInfoComplete(input: EventSetupInput): boolean {
  return Boolean(
    input.title?.trim() &&
      input.eventDate &&
      !Number.isNaN(new Date(input.eventDate).getTime()) &&
      hasVenue(input) &&
      hasRegistrationPeriod(input),
  );
}

function isPosterComplete(input: EventSetupInput): boolean {
  return Boolean(input.posterUrl?.trim()) || input.galleryImageCount > 0;
}

function isPaymentComplete(input: EventSetupInput): boolean {
  return input.paymentConfigured;
}

function isPrePublishReady(input: EventSetupInput): boolean {
  return (
    isBasicInfoComplete(input) &&
    input.divisionCount > 0 &&
    Boolean(input.publicSlug?.trim())
  );
}

function registrationPhaseLabel(input: EventSetupInput): string {
  const now = Date.now();
  const start = new Date(input.registrationStartDate).getTime();
  const end = new Date(input.registrationEndDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "신청 기간을 확인해 주세요.";
  if (now < start) return "신청 시작 전입니다.";
  if (now > end) return "신청 기간이 지났습니다.";
  return "지금 신청을 받을 수 있습니다.";
}

function buildBasicInfoStep(input: EventSetupInput): EventSetupStep {
  const complete = isBasicInfoComplete(input);
  return {
    id: "basic_info",
    order: 1,
    title: "기본 정보",
    description: complete
      ? "대회명, 일시, 장소, 신청 기간이 입력되었습니다."
      : "먼저 대회 기본 정보를 입력해 주세요.",
    status: complete ? "complete" : "needed",
    statusLabel: complete ? STATUS_LABEL.complete : STATUS_LABEL.needed,
    href: `/organizer/events/${input.eventId}#setup-basic`,
    actionLabel: complete ? "기본 정보 수정" : "기본 정보 입력",
    importance: "required",
  };
}

function buildPosterStep(input: EventSetupInput): EventSetupStep {
  const complete = isPosterComplete(input);
  return {
    id: "poster_public",
    order: 2,
    title: "포스터·공개 안내",
    description: complete
      ? "포스터 또는 상세 이미지가 등록되었습니다."
      : "참가자가 보게 될 포스터와 소개 문구를 등록해 주세요.",
    status: complete ? "complete" : "recommended",
    statusLabel: complete ? STATUS_LABEL.complete : STATUS_LABEL.recommended,
    href: `/organizer/events/${input.eventId}#setup-poster`,
    actionLabel: complete ? "포스터 수정" : "포스터 등록",
    importance: "recommended",
  };
}

function buildDivisionsStep(input: EventSetupInput): EventSetupStep {
  const complete = input.divisionCount > 0;
  return {
    id: "divisions",
    order: 3,
    title: "경기구분·체급표",
    description: complete
      ? `${input.divisionCount}개 경기구분이 준비되었습니다.`
      : "참가 신청을 받을 경기구분과 체급을 만들어 주세요.",
    status: complete ? "complete" : "needed",
    statusLabel: complete ? STATUS_LABEL.complete : STATUS_LABEL.needed,
    href: `/organizer/events/${input.eventId}#setup-divisions`,
    actionLabel: complete ? "경기구분 관리" : "경기구분 만들기",
    importance: "required",
  };
}

function buildApplicationFormStep(input: EventSetupInput): EventSetupStep {
  if (!input.applicationFormConfigured) {
    return {
      id: "application_form",
      order: 4,
      title: "신청서 설정",
      description:
        "신청서가 필요 없으면 '연결 해제'로 두어도 됩니다. PDF·자체 폼 중 필요한 방식을 선택해 주세요.",
      status: "review",
      statusLabel: STATUS_LABEL.review,
      href: `/organizer/events/${input.eventId}#setup-application-form`,
      actionLabel: "신청서 설정",
      importance: "recommended",
    };
  }

  const modeLabel =
    input.applicationFormMode === "custom"
      ? "자체 폼 신청서"
      : input.applicationFormMode === "pdf"
        ? "PDF 신청서"
        : "신청서 없음";

  return {
    id: "application_form",
    order: 4,
    title: "신청서 설정",
    description: `${modeLabel}으로 설정되었습니다.`,
    status: "complete",
    statusLabel: STATUS_LABEL.complete,
    href: `/organizer/events/${input.eventId}#setup-application-form`,
    actionLabel: "신청서 변경",
    importance: "recommended",
  };
}

function buildPaymentStep(input: EventSetupInput): EventSetupStep {
  const complete = isPaymentComplete(input);
  return {
    id: "payment",
    order: 5,
    title: "참가비·입금 안내",
    description: complete
      ? "참가비와 입금 계좌 안내가 등록되었습니다."
      : "참가비와 입금 계좌를 입력하면 체육관 신청 안내가 수월해집니다.",
    status: complete ? "complete" : "recommended",
    statusLabel: complete ? STATUS_LABEL.complete : STATUS_LABEL.recommended,
    href: `/organizer/events/${input.eventId}#setup-payment`,
    actionLabel: complete ? "입금 안내 수정" : "입금 안내 입력",
    importance: "recommended",
  };
}

function buildPrePublishStep(input: EventSetupInput): EventSetupStep {
  const ready = isPrePublishReady(input);
  const isOpen = input.status === EventStatus.open;
  const regLabel = registrationPhaseLabel(input);

  let status: SetupStepStatus = "review";
  if (isOpen && ready) status = "complete";
  else if (ready) status = "recommended";

  return {
    id: "pre_publish",
    order: 6,
    title: "공개 전 최종 확인",
    description: isOpen
      ? `대회가 공개 상태입니다. ${regLabel}`
      : ready
        ? `필수 준비가 끝났습니다. 공개 페이지를 확인한 뒤 신청 공개로 전환하세요. ${regLabel}`
        : "공개 전에 필수 항목을 먼저 채워 주세요.",
    status,
    statusLabel: STATUS_LABEL[status],
    href: `/events/${input.publicSlug}`,
    actionLabel: "공개 페이지 보기",
    importance: "required",
  };
}

export function buildEventSetupChecklist(
  input: EventSetupInput,
): EventSetupChecklist {
  const steps = [
    buildBasicInfoStep(input),
    buildPosterStep(input),
    buildDivisionsStep(input),
    buildApplicationFormStep(input),
    buildPaymentStep(input),
    buildPrePublishStep(input),
  ];

  const requiredSteps = steps.filter((s) => s.importance === "required");
  const requiredDone = requiredSteps.filter((s) => s.status === "complete").length;

  const scored = steps.map((step): number => {
    if (step.status === "complete") return 1;
    if (step.status === "recommended" || step.status === "review") return 0.5;
    return 0;
  });
  const completionRate = Math.round(
    (scored.reduce((sum, value) => sum + value, 0) / steps.length) * 100,
  );

  const nextActions = getNextRecommendedActions(input, steps);

  return {
    steps,
    completionRate,
    requiredDone,
    requiredTotal: requiredSteps.length,
    nextActions,
  };
}

export function getEventSetupCompletionRate(input: EventSetupInput): number {
  return buildEventSetupChecklist(input).completionRate;
}

export function getNextRecommendedActions(
  input: EventSetupInput,
  steps?: EventSetupStep[],
): EventSetupNextAction[] {
  const list = steps ?? buildEventSetupChecklist(input).steps;
  const priority: SetupStepStatus[] = ["needed", "review", "recommended"];

  const picked: EventSetupNextAction[] = [];
  for (const status of priority) {
    for (const step of list) {
      if (step.status !== status) continue;
      picked.push({
        stepId: step.id,
        title: step.title,
        description: step.description,
        href: step.href,
        actionLabel: step.actionLabel,
      });
      if (picked.length >= 3) return picked;
    }
  }

  if (picked.length === 0 && input.status !== EventStatus.open) {
    picked.push({
      stepId: "pre_publish",
      title: "공개 페이지 확인",
      description: "참가자가 보게 될 공개 공고를 미리 확인해 주세요.",
      href: `/events/${input.publicSlug}`,
      actionLabel: "공개 페이지 보기",
    });
  }

  return picked;
}

export function buildEventSetupInputFromDetail(
  detail: {
    id: string;
    publicSlug: string;
    title: string;
    description: string | null;
    location: string | null;
    roadAddress: string | null;
    eventDate: string;
    registrationStartDate: string;
    registrationEndDate: string;
    status: EventStatus;
    posterUrl: string | null;
    galleryImages: { id: string }[];
    divisions: { id: string }[];
    paymentSetting: {
      feeAmount: number | null;
      bankName: string | null;
      accountNumber: string | null;
    } | null;
  },
  options: {
    applicationFormMode: ApplicationFormMode;
    applicationFormConfigured: boolean;
  },
): EventSetupInput {
  const payment = detail.paymentSetting;
  const paymentConfigured = Boolean(
    payment &&
      payment.feeAmount != null &&
      payment.feeAmount >= 0 &&
      payment.bankName?.trim() &&
      payment.accountNumber?.trim(),
  );

  return {
    eventId: detail.id,
    publicSlug: detail.publicSlug,
    title: detail.title,
    description: detail.description,
    location: detail.location,
    roadAddress: detail.roadAddress,
    eventDate: detail.eventDate,
    registrationStartDate: detail.registrationStartDate,
    registrationEndDate: detail.registrationEndDate,
    status: detail.status,
    posterUrl: detail.posterUrl,
    galleryImageCount: detail.galleryImages.length,
    divisionCount: detail.divisions.length,
    applicationFormMode: options.applicationFormMode,
    applicationFormConfigured: options.applicationFormConfigured,
    paymentConfigured,
  };
}
