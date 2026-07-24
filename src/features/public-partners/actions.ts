"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { parseDateOnlyString } from "@/lib/date-only";
import { AppError } from "@/lib/errors/app-error";
import { parsePublicPartnerType } from "@/lib/public-partner-logo";
import { adminPublicPartnerService } from "@/lib/services/admin-public-partner.service";
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

function revalidatePartnerSurfaces() {
  revalidatePath("/admin/public-partners");
  revalidatePath("/");
  revalidatePath("/api/public/home-partners");
}

function parseOptionalDateField(raw: string): Date | null {
  if (!raw) return null;
  const d = parseDateOnlyString(raw);
  if (!d) {
    throw new AppError("VALIDATION_ERROR", "날짜 형식이 올바르지 않습니다.");
  }
  return d;
}

export async function createPublicPartnerAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const row = await adminPublicPartnerService.create(actor, {
      name: formReq(formData, "name"),
      type: parsePublicPartnerType(formReq(formData, "type")),
      logoPath: formReq(formData, "logoPath"),
      logoUrl: formReq(formData, "logoUrl"),
      websiteUrl: formReq(formData, "websiteUrl") || null,
      altText: formReq(formData, "altText") || null,
      description: formReq(formData, "description") || null,
      sortOrder: Number(formReq(formData, "sortOrder") || "0"),
      isActive: formData.get("isActive") === "on",
      openInNewTab: formData.get("openInNewTab") === "on",
      startsAt: parseOptionalDateField(formReq(formData, "startsAt")),
      endsAt: parseOptionalDateField(formReq(formData, "endsAt")),
    });
    revalidatePartnerSurfaces();
    return actionSuccess({ id: row.id });
  });
}

export async function updatePublicPartnerAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const logoPath = formReq(formData, "logoPath");
    const logoUrl = formReq(formData, "logoUrl");
    await adminPublicPartnerService.update(actor, formReq(formData, "id"), {
      name: formReq(formData, "name"),
      type: parsePublicPartnerType(formReq(formData, "type")),
      logoPath: logoPath || undefined,
      logoUrl: logoUrl || undefined,
      websiteUrl: formReq(formData, "websiteUrl") || null,
      altText: formReq(formData, "altText") || null,
      description: formReq(formData, "description") || null,
      sortOrder: Number(formReq(formData, "sortOrder") || "0"),
      isActive: formData.get("isActive") === "on",
      openInNewTab: formData.get("openInNewTab") === "on",
      startsAtRaw: formReq(formData, "startsAt") || null,
      endsAtRaw: formReq(formData, "endsAt") || null,
    });
    revalidatePartnerSurfaces();
    return actionSuccess({ ok: true as const });
  });
}

export async function softDeletePublicPartnerAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    await adminPublicPartnerService.update(actor, formReq(formData, "id"), {
      softDelete: true,
    });
    revalidatePartnerSurfaces();
    return actionSuccess({ ok: true as const });
  });
}

export async function issuePublicPartnerLogoUploadAction(
  mimeType: string,
  partnerId?: string,
): Promise<ActionResult<{ uploadUrl: string; path: string; publicUrl: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const res = await adminPublicPartnerService.issueLogoUpload(
      actor,
      mimeType,
      partnerId,
    );
    return actionSuccess(res);
  });
}

export async function togglePublicPartnerActiveAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const id = formReq(formData, "id");
    const isActive = formReq(formData, "isActive") === "true";
    await adminPublicPartnerService.update(actor, id, { isActive: !isActive });
    revalidatePartnerSurfaces();
    return actionSuccess({ ok: true as const });
  });
}

export async function movePublicPartnerSortAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const direction = formReq(formData, "direction") === "up" ? "up" : "down";
    await adminPublicPartnerService.moveSortOrder(
      actor,
      formReq(formData, "id"),
      direction,
    );
    revalidatePartnerSurfaces();
    return actionSuccess({ ok: true as const });
  });
}
