import type { EventStatus } from "@/lib/enums";
import { gymListingBadgeLabel } from "@/lib/gym-event-apply";
import type { MatchonStatus } from "@/lib/ui/matchon-status";

function toListingBadgeInput(input: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
}) {
  return {
    status: input.status,
    registrationStartDate: new Date(input.registrationStartDate),
    registrationEndDate: new Date(input.registrationEndDate),
  };
}

/** 체육관 대회 목록 — 단계 배지 → MatchonStatusBadge */
export function resolveGymListingBadgeMatchonStatus(input: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
}): MatchonStatus {
  const badge = gymListingBadgeLabel(toListingBadgeInput(input));
  switch (badge) {
    case "종료":
      return "completed";
    case "취소":
      return "cancelled";
    case "대회 진행":
      return "in_progress";
    case "대진표 준비":
      return "active";
    case "신청 마감":
      return "application_pending";
    case "신청 예정":
      return "waiting";
    case "신청 기간":
      return "public";
    default:
      return "waiting";
  }
}

export function getGymListingBadgeLabel(input: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
}): string {
  return gymListingBadgeLabel(toListingBadgeInput(input));
}

/** 체육관 대회 목록 — 신청 가능 여부 라벨 → MatchonStatusBadge */
export function resolveGymApplyStatusMatchonStatus(input: {
  canApply: boolean;
  registrationStatusLabel: string;
}): MatchonStatus {
  if (input.canApply) return "approved";

  switch (input.registrationStatusLabel) {
    case "대회 종료":
      return "completed";
    case "대회 진행 중":
      return "in_progress";
    case "대진 준비":
      return "active";
    case "신청 마감":
      return "application_pending";
    case "신청 불가":
      return "unapproved";
    case "신청 시작 전":
      return "waiting";
    case "경기구분 설정 필요":
      return "application_pending";
    case "입금 설정 필요":
      return "unpaid";
    case "신청 가능":
      return "waiting";
    default:
      return "waiting";
  }
}
