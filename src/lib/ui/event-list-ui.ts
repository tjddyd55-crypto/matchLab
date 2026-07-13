import type { EventStatus } from "@/lib/enums";
import {
  ORGANIZER_EVENT_STATUS_LABELS,
  ORGANIZER_REGISTRATION_STATUS_LABELS,
  resolveOrganizerRegistrationStatus,
  type OrganizerRegistrationStatus,
} from "@/lib/event-organizer-status";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  publicApplicationFieldInputClass,
  publicApplicationFieldSelectClass,
} from "@/lib/ui/public-application-ui";
import {
  getPublicRegistrationStatusLabel,
  resolvePublicRegistrationMatchonStatus,
} from "@/lib/ui/public-spectator-ui";

/** 대회 목록 공통 입력 스타일 */
export const eventListFieldInputClass = publicApplicationFieldInputClass;
export const eventListFieldSelectClass = publicApplicationFieldSelectClass;

/** 운영자 대회 목록 — 대회 운영 상태 → MatchonStatusBadge */
export function resolveOrganizerEventListMatchonStatus(
  status: EventStatus,
): MatchonStatus {
  switch (status) {
    case "draft":
      return "application_pending";
    case "open":
      return "public";
    case "closed":
      return "application_pending";
    case "bracket_ready":
      return "active";
    case "ongoing":
      return "in_progress";
    case "finished":
      return "completed";
    case "cancelled":
    default:
      return "cancelled";
  }
}

export function getOrganizerEventListStatusLabel(status: EventStatus): string {
  return ORGANIZER_EVENT_STATUS_LABELS[status];
}

/** 운영자 대회 목록 — 접수 상태 → MatchonStatusBadge */
export function resolveOrganizerEventRegistrationMatchonStatus(input: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
}): MatchonStatus {
  const reg = resolveOrganizerRegistrationStatus({
    status: input.status,
    registrationStartDate: input.registrationStartDate,
    registrationEndDate: input.registrationEndDate,
  });
  return resolvePublicRegistrationMatchonStatus(reg);
}

export function getOrganizerEventRegistrationLabel(input: {
  status: EventStatus;
  registrationStartDate: string;
  registrationEndDate: string;
}): string {
  const reg = resolveOrganizerRegistrationStatus({
    status: input.status,
    registrationStartDate: input.registrationStartDate,
    registrationEndDate: input.registrationEndDate,
  });
  return ORGANIZER_REGISTRATION_STATUS_LABELS[reg];
}

export function getOrganizerRegistrationStatusLabel(
  status: OrganizerRegistrationStatus,
): string {
  return ORGANIZER_REGISTRATION_STATUS_LABELS[status];
}

export {
  getPublicRegistrationStatusLabel,
  resolvePublicRegistrationMatchonStatus,
};

/** 운영자 대회 목록 — 상태 필터 탭 */
export type OrganizerEventListFilter =
  | "all"
  | "ongoing"
  | "registration"
  | "preparing"
  | "finished";

export const ORGANIZER_EVENT_LIST_FILTER_TABS: {
  id: OrganizerEventListFilter;
  label: string;
}[] = [
  { id: "all", label: "전체" },
  { id: "ongoing", label: "진행 중" },
  { id: "registration", label: "신청 중" },
  { id: "preparing", label: "준비 중" },
  { id: "finished", label: "종료" },
];

export function matchesOrganizerEventListFilter(
  status: EventStatus,
  filter: OrganizerEventListFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "ongoing") return status === "ongoing";
  if (filter === "registration") return status === "open";
  if (filter === "preparing") {
    return (
      status === "draft" ||
      status === "closed" ||
      status === "bracket_ready"
    );
  }
  if (filter === "finished") {
    return status === "finished" || status === "cancelled";
  }
  return true;
}

export const organizerEventListTableWrapClass =
  "hidden w-full min-w-0 overflow-x-auto rounded-xl border border-matchon-border bg-white md:block";

export const organizerEventListFilterBarClass =
  "flex flex-wrap gap-2";
