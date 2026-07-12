import type { EventStatus } from "@/lib/enums";
import type { OrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import {
  PUBLIC_BRACKET_VISIBILITY_LABELS,
  PUBLIC_REGISTRATION_STATUS_LABELS,
  PUBLIC_RESULTS_VISIBILITY_LABELS,
  type PublicBracketVisibility,
  type PublicEventDeadlinePhase,
  type PublicResultsVisibility,
  resolvePublicEventDeadlineLabel,
  type PublicEventDeadlineInput,
} from "@/lib/event-public-display";
import { ORGANIZER_EVENT_STATUS_LABELS } from "@/lib/event-organizer-status";
import type { MatchonStatus } from "@/lib/ui/matchon-status";

/** 공개 대회 신청 상태 → MatchonStatusBadge */
export function resolvePublicRegistrationMatchonStatus(
  status: OrganizerRegistrationStatus,
): MatchonStatus {
  switch (status) {
    case "open":
      return "approved";
    case "closed":
      return "application_pending";
    case "unavailable":
      return "unapproved";
    case "before":
    case "unknown":
    default:
      return "waiting";
  }
}

export function getPublicRegistrationStatusLabel(
  status: OrganizerRegistrationStatus,
): string {
  return PUBLIC_REGISTRATION_STATUS_LABELS[status];
}

/** 공개 대회 진행 상태 → MatchonStatusBadge */
export function resolvePublicEventStatusMatchonStatus(
  status: EventStatus,
): MatchonStatus {
  switch (status) {
    case "ongoing":
      return "in_progress";
    case "finished":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "bracket_ready":
      return "active";
    case "open":
    case "closed":
    default:
      return "waiting";
  }
}

export function getPublicEventStatusLabel(status: EventStatus): string {
  return ORGANIZER_EVENT_STATUS_LABELS[status];
}

/** 대진표 공개 여부 → MatchonStatusBadge */
export function resolvePublicBracketVisibilityMatchonStatus(
  visibility: PublicBracketVisibility,
): MatchonStatus {
  return visibility === "published" ? "public" : "waiting";
}

export function getPublicBracketVisibilityLabel(
  visibility: PublicBracketVisibility,
): string {
  return PUBLIC_BRACKET_VISIBILITY_LABELS[visibility];
}

/** 결과 공개 여부 → MatchonStatusBadge */
export function resolvePublicResultsVisibilityMatchonStatus(
  visibility: PublicResultsVisibility,
): MatchonStatus {
  switch (visibility) {
    case "published":
      return "application_completed";
    case "preparing":
      return "waiting";
    case "none":
    default:
      return "inactive";
  }
}

export function getPublicResultsVisibilityLabel(
  visibility: PublicResultsVisibility,
): string {
  return PUBLIC_RESULTS_VISIBILITY_LABELS[visibility];
}

/** 접수 마감 D-day 배지 → MatchonStatusBadge */
export function resolvePublicDeadlinePhaseMatchonStatus(
  phase: PublicEventDeadlinePhase,
): MatchonStatus {
  switch (phase) {
    case "registration_open":
      return "approved";
    case "registration_before":
      return "waiting";
    case "registration_closed":
      return "application_pending";
    case "event_finished":
    default:
      return "completed";
  }
}

export function getPublicDeadlineLabel(
  event: PublicEventDeadlineInput,
  now?: Date,
): string {
  return resolvePublicEventDeadlineLabel(event, now);
}
