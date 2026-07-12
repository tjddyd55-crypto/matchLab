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
