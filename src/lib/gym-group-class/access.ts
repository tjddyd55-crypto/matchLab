import type { ActorContext } from "@/lib/auth/actor-context";
import { PermissionError } from "@/lib/auth/permission-error";
import {
  requireGymPortalOwnerManage,
  requireGymPortalRead,
  type GymPortalAccess,
} from "@/lib/gym-portal-access";
import { isGymPortalOwner } from "@/lib/permissions";

export type GymGroupClassAccess = GymPortalAccess & {
  isOwner: boolean;
  gymStaffId: string | null;
};

export async function requireGymGroupClassRead(
  actor: ActorContext,
): Promise<GymGroupClassAccess> {
  const access = await requireGymPortalRead(actor);
  return {
    ...access,
    isOwner: access.isOwner || isGymPortalOwner(actor) || actor.role === "admin",
    gymStaffId: access.gymStaffId,
  };
}

export async function requireGymGroupClassWrite(
  actor: ActorContext,
): Promise<GymGroupClassAccess> {
  const access = await requireGymGroupClassRead(actor);
  if (access.isOwner || actor.role === "admin") return access;
  if (actor.role === "gym_staff" && access.gymStaffId) {
    if (!access.canRead) {
      throw new PermissionError("FORBIDDEN", "그룹수업에 접근할 수 없습니다.");
    }
    return access;
  }
  throw new PermissionError("FORBIDDEN", "그룹수업을 수정할 권한이 없습니다.");
}

export async function requireGymGroupClassManageParticipants(
  actor: ActorContext,
): Promise<GymGroupClassAccess> {
  return requireGymGroupClassWrite(actor);
}

export async function requireGymGroupClassOwnerManage(
  actor: ActorContext,
): Promise<GymGroupClassAccess> {
  const access = await requireGymPortalOwnerManage(actor);
  return {
    ...access,
    isOwner: true,
    gymStaffId: access.gymStaffId,
  };
}

/** owner 전체 / staff는 담당 instructor만 */
export function canManageGymGroupClass(
  access: GymGroupClassAccess,
  instructorStaffId: string | null,
): boolean {
  if (access.isOwner) return true;
  return Boolean(
    access.gymStaffId &&
      instructorStaffId &&
      access.gymStaffId === instructorStaffId,
  );
}

export function canViewGymGroupClass(
  access: GymGroupClassAccess,
  instructorStaffId: string | null,
): boolean {
  void instructorStaffId;
  // Stage 3: staff는 같은 Gym 수업 조회 허용
  return access.canRead;
}
