import type { ActorContext } from "@/lib/auth/actor-context";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  requireGymPortalOwnerManage,
  requireGymPortalRead,
  type GymPortalAccess,
} from "@/lib/gym-portal-access";
import { isGymPortalOwner } from "@/lib/permissions";

export type GymScheduleAccess = GymPortalAccess & {
  isOwner: boolean;
  gymStaffId: string | null;
};

export async function requireGymScheduleRead(
  actor: ActorContext,
): Promise<GymScheduleAccess> {
  const access = await requireGymPortalRead(actor);
  return {
    ...access,
    isOwner: access.isOwner || isGymPortalOwner(actor) || actor.role === "admin",
    gymStaffId: access.gymStaffId,
  };
}

/**
 * 일정 생성·수정·완료·취소.
 * owner: 자기 Gym 전체 / staff: 자기 일정만 (호출측에서 gymStaffId 강제).
 */
export async function requireGymScheduleWrite(
  actor: ActorContext,
): Promise<GymScheduleAccess> {
  const access = await requireGymScheduleRead(actor);
  if (access.isOwner || actor.role === "admin") {
    return access;
  }
  if (actor.role === "gym_staff" && access.gymStaffId) {
    if (!access.canRead) {
      throw new PermissionError("FORBIDDEN", "일정에 접근할 수 없습니다.");
    }
    return access;
  }
  throw new PermissionError("FORBIDDEN", "일정을 수정할 권한이 없습니다.");
}

/** owner 전용 — 다른 staff 일정 강제 관리 */
export async function requireGymScheduleOwnerManage(
  actor: ActorContext,
): Promise<GymScheduleAccess> {
  const access = await requireGymPortalOwnerManage(actor);
  return {
    ...access,
    isOwner: true,
    gymStaffId: access.gymStaffId,
  };
}

export function canManageGymScheduleRow(
  access: GymScheduleAccess,
  scheduleStaffId: string,
): boolean {
  if (access.isOwner) return true;
  return Boolean(access.gymStaffId && access.gymStaffId === scheduleStaffId);
}

export function canViewGymScheduleRow(
  access: GymScheduleAccess,
  scheduleStaffId: string,
  opts?: { myOnly?: boolean },
): boolean {
  if (opts?.myOnly || !access.isOwner) {
    return Boolean(access.gymStaffId && access.gymStaffId === scheduleStaffId);
  }
  return true;
}
