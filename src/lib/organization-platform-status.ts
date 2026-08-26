import {
  EventStatus,
  GymStatus,
  OrganizerStatus,
  OrganizerType,
} from "@/generated/prisma";
import type { GymStatus as GymStatusType, OrganizerStatus as OrganizerStatusType } from "@/lib/enums";
import { isPublicEventInProgress } from "@/lib/event-public";

/** Admin 상태 변경 사유 최소 길이 */
export const ORGANIZATION_STATUS_REASON_MIN_LENGTH = 2;

export type OrganizationStatusMutationTarget = "organizer" | "gym";

/** Phase 2-1: active ↔ suspended만 mutation 허용. archived는 표시만. */
export const MUTABLE_ORGANIZER_STATUSES = [
  OrganizerStatus.active,
  OrganizerStatus.suspended,
] as const;

export const MUTABLE_GYM_STATUSES = [
  GymStatus.active,
  GymStatus.suspended,
] as const;

export function normalizeOrganizationStatusReason(raw: string): string {
  return raw.trim();
}

export function assertOrganizationStatusReason(reason: string): void {
  if (
    normalizeOrganizationStatusReason(reason).length <
    ORGANIZATION_STATUS_REASON_MIN_LENGTH
  ) {
    throw new Error("ORGANIZATION_STATUS_REASON_TOO_SHORT");
  }
}

export function isMutableOrganizerStatusTransition(
  from: OrganizerStatus,
  to: OrganizerStatus,
): boolean {
  if (from === to) return false;
  if (from === OrganizerStatus.pending || to === OrganizerStatus.pending) {
    return false;
  }
  if (
    from === OrganizerStatus.archived ||
    to === OrganizerStatus.archived
  ) {
    return false;
  }
  return (
    (from === OrganizerStatus.active && to === OrganizerStatus.suspended) ||
    (from === OrganizerStatus.suspended && to === OrganizerStatus.active)
  );
}

export function isMutableGymStatusTransition(
  from: GymStatus,
  to: GymStatus,
): boolean {
  if (from === to) return false;
  if (from === GymStatus.archived || to === GymStatus.archived) {
    return false;
  }
  return (
    (from === GymStatus.active && to === GymStatus.suspended) ||
    (from === GymStatus.suspended && to === GymStatus.active)
  );
}

/**
 * OPTION B — 현장 운영 허용 EventStatus SSOT.
 * `isPublicEventInProgress`와 동일: bracket_ready | ongoing.
 */
export function isOrganizerFieldOperationsEventStatus(
  status: EventStatus,
): boolean {
  return isPublicEventInProgress(status);
}

export function isAssociationOrganizerType(type: OrganizerType): boolean {
  return type === OrganizerType.association;
}

export type AdminOrganizationKind = "association" | "gym";

/** Admin UI: active/suspended만 상태 관리 dialog 노출 */
export function canManageOrganizationStatus(
  kind: AdminOrganizationKind,
  status: OrganizerStatusType | GymStatusType,
): boolean {
  if (kind === "association") {
    return (
      status === OrganizerStatus.active ||
      status === OrganizerStatus.suspended
    );
  }
  return status === GymStatus.active || status === GymStatus.suspended;
}
