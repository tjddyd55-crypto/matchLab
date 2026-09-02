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
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import { gymMemberCustomFieldService } from "@/lib/services/gym-member-custom-field.service";
import { gymMemberProfileService } from "@/lib/services/gym-member-profile.service";

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

export async function saveGymMemberCustomFieldsAction(
  fields: GymMemberDynamicFieldDefinition[],
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberCustomFieldService.saveFields(actor, fields);
    revalidatePath("/gym/member-custom-fields");
    revalidatePath("/gym/members/new");
    revalidatePath("/gym/members");
    return actionSuccess({ ok: true });
  });
}

export async function enableKickboxingMemberTemplateAction(): Promise<
  ActionResult<{ templateId: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymMemberProfileService.enableKickboxingTemplate(actor);
    revalidatePath("/gym/member-custom-fields");
    revalidatePath("/gym/members/new");
    revalidatePath("/gym/members");
    return actionSuccess(result);
  });
}
