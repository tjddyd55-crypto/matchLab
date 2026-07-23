import { EventStatus } from "@/lib/enums";

/**
 * 사용자용 체육관 대회 신청 가능 단계 SSOT.
 * DB EventStatus와 접수 기간을 합쳐 표시한다.
 */
export type GymEventAvailabilityPhase =
  | "scheduled"
  | "open"
  | "closed"
  | "ongoing"
  | "finished"
  | "unavailable";

export function computeGymEventApplicationAvailability(
  input: Pick<
    GymEventApplyEvaluationInput,
    "status" | "registrationStartDate" | "registrationEndDate"
  >,
  now: Date = new Date(),
): {
  phase: GymEventAvailabilityPhase;
  label: string;
  canStartApplication: boolean;
} {
  const { status, registrationStartDate, registrationEndDate } = input;

  if (status === EventStatus.finished) {
    return { phase: "finished", label: "종료", canStartApplication: false };
  }
  if (status === EventStatus.ongoing || status === EventStatus.bracket_ready) {
    return { phase: "ongoing", label: "진행 중", canStartApplication: false };
  }
  if (status === EventStatus.closed) {
    return { phase: "closed", label: "마감", canStartApplication: false };
  }
  if (status !== EventStatus.open) {
    return {
      phase: "unavailable",
      label: "신청 불가",
      canStartApplication: false,
    };
  }
  if (now < registrationStartDate) {
    return {
      phase: "scheduled",
      label: "모집 예정",
      canStartApplication: false,
    };
  }
  if (now > registrationEndDate) {
    return { phase: "closed", label: "마감", canStartApplication: false };
  }
  return { phase: "open", label: "모집 중", canStartApplication: true };
}

/** 체육관 목록에 노출할 공개 상태 (draft·cancelled 제외) */
export const GYM_VISIBLE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.open,
  EventStatus.closed,
  EventStatus.bracket_ready,
  EventStatus.ongoing,
  EventStatus.finished,
];

export type GymEventApplyEvaluationInput = {
  status: EventStatus;
  registrationStartDate: Date;
  registrationEndDate: Date;
  divisionCount: number;
  hasPaymentSetting: boolean;
  activeFighterCount: number;
};

export type GymEventApplyEvaluation = {
  canApply: boolean;
  applyDisabledReason?: string;
  registrationStatusLabel: string;
};

/**
 * 목록 카드용 신청 가능 여부·라벨 (실제 신청 API 검증은 application.service 유지).
 */
export function evaluateGymEventApplyEligibility(
  input: GymEventApplyEvaluationInput,
  now: Date = new Date(),
): GymEventApplyEvaluation {
  const { status, registrationStartDate, registrationEndDate } = input;

  if (status === EventStatus.finished) {
    return {
      canApply: false,
      registrationStatusLabel: "대회 종료",
      applyDisabledReason: "종료된 대회입니다.",
    };
  }

  if (
    status === EventStatus.ongoing ||
    status === EventStatus.bracket_ready ||
    status === EventStatus.closed
  ) {
    const label =
      status === EventStatus.ongoing
        ? "대회 진행 중"
        : status === EventStatus.bracket_ready
          ? "대진 준비"
          : "신청 마감";
    return {
      canApply: false,
      registrationStatusLabel: label,
      applyDisabledReason: "신청이 열려 있지 않은 대회입니다.",
    };
  }

  if (status !== EventStatus.open) {
    return {
      canApply: false,
      registrationStatusLabel: "신청 불가",
      applyDisabledReason: "신청할 수 없는 상태입니다.",
    };
  }

  if (now < registrationStartDate) {
    return {
      canApply: false,
      registrationStatusLabel: "신청 시작 전",
      applyDisabledReason: "신청 기간이 아직 시작되지 않았습니다.",
    };
  }

  if (now > registrationEndDate) {
    return {
      canApply: false,
      registrationStatusLabel: "신청 마감",
      applyDisabledReason: "신청 기간이 종료되었습니다.",
    };
  }

  if (input.divisionCount < 1) {
    return {
      canApply: false,
      registrationStatusLabel: "경기구분 설정 필요",
      applyDisabledReason: "주최자가 경기구분을 설정해야 신청할 수 있습니다.",
    };
  }

  if (!input.hasPaymentSetting) {
    return {
      canApply: false,
      registrationStatusLabel: "입금 설정 필요",
      applyDisabledReason: "주최자가 입금 정보를 설정해야 신청할 수 있습니다.",
    };
  }

  if (input.activeFighterCount < 1) {
    return {
      canApply: false,
      registrationStatusLabel: "신청 가능",
      applyDisabledReason:
        "GymMember와 연결된 활성 선수가 없습니다. 회원을 선수로 등록해 주세요.",
    };
  }

  return {
    canApply: true,
    registrationStatusLabel: "신청 가능",
  };
}

/** 체육관 목록 카드용 단계 배지 (신청 가능 여부와 별개 그룹 라벨) */
export function gymListingBadgeLabel(
  input: Pick<
    GymEventApplyEvaluationInput,
    "status" | "registrationStartDate" | "registrationEndDate"
  >,
  now: Date = new Date(),
): string {
  switch (input.status) {
    case EventStatus.finished:
      return "종료";
    case EventStatus.cancelled:
      return "취소";
    case EventStatus.ongoing:
      return "대회 진행";
    case EventStatus.bracket_ready:
      return "대진표 준비";
    case EventStatus.closed:
      return "신청 마감";
    case EventStatus.open:
      if (now < input.registrationStartDate) return "신청 예정";
      if (now > input.registrationEndDate) return "신청 마감";
      return "신청 기간";
    default:
      return "안내";
  }
}
