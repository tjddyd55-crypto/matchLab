"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { gymAssociationConnectionService } from "@/lib/services/gym-association-connection.service";

function mapError(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) {
    return actionFailure("FORBIDDEN", e.message || "권한이 없습니다.");
  }
  if (e instanceof AppError) {
    return actionFailure(
      e.code === "VALIDATION_ERROR"
        ? "VALIDATION_ERROR"
        : e.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : e.code === "CONFLICT"
            ? "CONFLICT"
            : "FORBIDDEN",
      e.message,
      e.details,
    );
  }
  console.error("[gym-association-connection]", e);
  return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
}

function revalidateGymAssociationPaths() {
  revalidatePath("/gym/associations");
  revalidatePath("/gym/profile");
  revalidatePath("/organizer/member-gyms/connection-requests");
  revalidatePath("/organizer/member-gyms");
  revalidatePath("/organizer/member-gyms/overview");
}

export async function requestGymAssociationMembershipAction(
  associationOrganizerId: string,
  memo?: string,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const actor = await requireActorFromMutation();
    const id = associationOrganizerId.trim();
    if (!id) {
      return actionFailure("VALIDATION_ERROR", "협회를 선택해 주세요.");
    }
    const result = await gymAssociationConnectionService.requestConnection(
      actor,
      id,
      memo,
    );
    revalidateGymAssociationPaths();
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function cancelGymAssociationMembershipRequestAction(
  requestId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    await gymAssociationConnectionService.cancelRequest(actor, requestId);
    revalidateGymAssociationPaths();
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function disconnectGymAssociationMembershipAction(
  memberGymId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    await gymAssociationConnectionService.disconnectMembership(
      actor,
      memberGymId,
    );
    revalidateGymAssociationPaths();
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function approveGymAssociationMembershipAction(
  requestId: string,
  note?: string,
): Promise<ActionResult<{ memberGymId: string }>> {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymAssociationConnectionService.approveRequest(
      actor,
      requestId,
      note,
    );
    revalidateGymAssociationPaths();
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function rejectGymAssociationMembershipAction(
  requestId: string,
  note?: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    await gymAssociationConnectionService.rejectRequest(actor, requestId, note);
    revalidateGymAssociationPaths();
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function disconnectGymAssociationByOrganizerAction(
  memberGymId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    await gymAssociationConnectionService.disconnectByAssociation(
      actor,
      memberGymId,
    );
    revalidateGymAssociationPaths();
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}
