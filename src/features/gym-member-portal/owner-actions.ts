"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(
        permissionReasonToActionCode(e.reason),
        e.message,
      );
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function revalidateOwnerPaths() {
  revalidatePath("/gym/member-portal");
}

export async function createGymMemberPortalAction(): Promise<
  ActionResult<{
    portalId: string;
    path: string;
    url: string;
    rawToken: string;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymMemberPortalService.createPortal(actor);
    revalidateOwnerPaths();
    return actionSuccess(result);
  });
}

export async function rotateGymMemberPortalAction(): Promise<
  ActionResult<{
    portalId: string;
    path: string;
    url: string;
    rawToken: string;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymMemberPortalService.rotatePortalToken(actor);
    revalidateOwnerPaths();
    return actionSuccess(result);
  });
}

export async function revokeGymMemberPortalAction(): Promise<
  ActionResult<{ portalId: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymMemberPortalService.revokePortal(actor);
    revalidateOwnerPaths();
    return actionSuccess(result);
  });
}
