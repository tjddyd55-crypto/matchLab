"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { associationGymConnectionService } from "@/lib/services/association-gym-connection.service";
import { revalidatePath } from "next/cache";

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

export async function submitAssociationConnectionRequestAction(
  associationOrganizerId: string,
  memo?: string,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const row = await associationGymConnectionService.submitRequest(
      actor,
      associationOrganizerId,
      memo,
    );
    revalidatePath("/gym/associations");
    return actionSuccess({ id: row.id });
  });
}

export async function cancelAssociationConnectionRequestAction(
  requestId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    await associationGymConnectionService.cancelRequest(actor, requestId);
    revalidatePath("/gym/associations");
    return actionSuccess({ ok: true as const });
  });
}

export async function approveAssociationConnectionRequestAction(
  requestId: string,
): Promise<ActionResult<{ memberGymId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    if (!actor.organizerId) {
      throw new AppError("FORBIDDEN", "협회 권한이 없습니다.");
    }
    const res = await associationGymConnectionService.approve(
      actor,
      requestId,
      actor.organizerId,
    );
    revalidatePath("/organizer/member-gyms/applications");
    revalidatePath("/organizer/member-gyms");
    return actionSuccess({ memberGymId: res.memberGymId });
  });
}

export async function rejectAssociationConnectionRequestAction(
  requestId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    if (!actor.organizerId) {
      throw new AppError("FORBIDDEN", "협회 권한이 없습니다.");
    }
    await associationGymConnectionService.reject(
      actor,
      requestId,
      actor.organizerId,
    );
    revalidatePath("/organizer/member-gyms/applications");
    return actionSuccess({ ok: true as const });
  });
}
