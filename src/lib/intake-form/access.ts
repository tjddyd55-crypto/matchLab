import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import type { IntakeFormOwnerType } from "@/generated/prisma";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import {
  requireAssociationOrganizerScope,
  requireOrganizerPlatformActiveForWrite,
  requireRole,
} from "@/lib/permissions";
import { requireOrganizerPortalGeneralWrite } from "@/lib/organizer-portal-access";

export type IntakeFormOwnerScope = {
  ownerType: IntakeFormOwnerType;
  organizerId: string | null;
  gymId: string | null;
};

export async function resolveIntakeFormOwnerScopeForOrganizer(
  actor: ActorContext,
  explicitOrganizerId?: string | null,
): Promise<IntakeFormOwnerScope> {
  if (actor.role === "organizer") {
    await requireOrganizerPortalGeneralWrite(actor);
  }
  const organizerId = await requireAssociationOrganizerScope(
    actor,
    explicitOrganizerId,
  );
  return { ownerType: "organizer", organizerId, gymId: null };
}

/** 협회·일반 주최자 organizer scope — association gate 없이 */
export async function resolveIntakeFormOwnerScopeForAnyOrganizer(
  actor: ActorContext,
): Promise<IntakeFormOwnerScope> {
  if (actor.role === "organizer") {
    await requireOrganizerPortalGeneralWrite(actor);
  }
  requireRole(actor, ["organizer", "admin"]);
  if (actor.role === "admin") {
    throw new AppError(
      "FORBIDDEN",
      "관리자는 organizer 컨텍스트에서 신청 폼을 관리할 수 없습니다.",
    );
  }
  if (!actor.organizerId) {
    throw new PermissionError("FORBIDDEN", "주최자 컨텍스트가 없습니다.");
  }
  return {
    ownerType: "organizer",
    organizerId: actor.organizerId,
    gymId: null,
  };
}

export async function resolveIntakeFormOwnerScopeForGym(
  actor: ActorContext,
): Promise<IntakeFormOwnerScope> {
  const access = await requireGymPortalWrite(actor);
  return { ownerType: "gym", organizerId: null, gymId: access.gymId };
}

export function matchesIntakeFormOwnerScope(
  form: {
    ownerType: IntakeFormOwnerType;
    organizerId: string | null;
    gymId: string | null;
  },
  scope: IntakeFormOwnerScope,
): boolean {
  if (form.ownerType !== scope.ownerType) return false;
  if (scope.ownerType === "organizer") {
    return form.organizerId === scope.organizerId;
  }
  return form.gymId === scope.gymId;
}

export async function requireAssociationScheduleOrganizerScope(
  actor: ActorContext,
  explicitOrganizerId?: string | null,
): Promise<string> {
  if (actor.role === "organizer") {
    await requireOrganizerPlatformActiveForWrite(actor);
  }
  return requireAssociationOrganizerScope(actor, explicitOrganizerId);
}
