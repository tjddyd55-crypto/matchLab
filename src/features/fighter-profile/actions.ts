"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fighterProfileService } from "@/lib/services/fighter-profile.service";
import { fighterProfileUpdateSchema } from "@/lib/validators/fighter-profile.validator";

export async function updateFighterProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = fighterProfileUpdateSchema.safeParse({
      displayName: formData.get("displayName"),
      bio: formData.get("bio"),
      snsInstagram: formData.get("snsInstagram"),
      snsYoutube: formData.get("snsYoutube"),
      snsTiktok: formData.get("snsTiktok"),
      profileImageUrl: formData.get("profileImageUrl"),
      profileImagePath: formData.get("profileImagePath"),
      isPublic: formData.get("isPublic"),
      slug: formData.get("slug"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await fighterProfileService.updateProfile(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  }
}
