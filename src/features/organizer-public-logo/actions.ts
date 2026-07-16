"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { organizerPublicLogoService } from "@/lib/services/organizer-public-logo.service";
import { revalidatePath } from "next/cache";

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

export async function issueOrganizerPublicLogoUploadAction(
  mimeType: string,
): Promise<ActionResult<{ uploadUrl: string; path: string; publicUrl: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const res = await organizerPublicLogoService.issueLogoUpload(actor, mimeType);
    return actionSuccess(res);
  });
}

export async function saveOrganizerPublicLogoAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    await organizerPublicLogoService.update(actor, {
      logoPath: formReq(formData, "logoPath") || undefined,
      logoUrl: formReq(formData, "logoUrl") || undefined,
      publicLogoVisible: formData.get("publicLogoVisible") === "on",
      websiteUrl: formReq(formData, "websiteUrl") || null,
    });
    revalidatePath("/organizer/member-gyms/settings");
    revalidatePath("/");
    return actionSuccess({ ok: true as const });
  });
}
