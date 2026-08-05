"use server";

import { AssociationApplicationAttachmentType } from "@/lib/enums";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { associationApplicationService } from "@/lib/services/association-application.service";
import { associationApplicationUploadService } from "@/lib/services/association-application-upload.service";
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

function parseAttachments(formData: FormData) {
  const raw = formReq(formData, "attachmentsJson");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("VALIDATION_ERROR", "첨부 정보가 올바르지 않습니다.");
  }
  if (!Array.isArray(parsed)) {
    throw new AppError("VALIDATION_ERROR", "첨부 정보가 올바르지 않습니다.");
  }
  return parsed.map((item) => {
    const row = item as Record<string, unknown>;
    const attachmentType = String(row.attachmentType ?? "");
    if (
      !Object.values(AssociationApplicationAttachmentType).includes(
        attachmentType as AssociationApplicationAttachmentType,
      )
    ) {
      throw new AppError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다.");
    }
    return {
      attachmentType: attachmentType as AssociationApplicationAttachmentType,
      storagePath: String(row.storagePath ?? ""),
      originalFileName: String(row.originalFileName ?? ""),
      mimeType: String(row.mimeType ?? ""),
      sizeBytes: Number(row.sizeBytes ?? 0),
    };
  });
}

export async function submitAssociationApplicationAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const row = await associationApplicationService.submit({
      associationName: formReq(formData, "associationName"),
      associationNameEn: formReq(formData, "associationNameEn") || undefined,
      representativeName: formReq(formData, "representativeName"),
      contactName: formReq(formData, "contactName"),
      contactPhone: formReq(formData, "contactPhone"),
      contactEmail: formReq(formData, "contactEmail"),
      requestedLoginId: formReq(formData, "requestedLoginId"),
      address: formReq(formData, "address") || undefined,
      addressDetail: formReq(formData, "addressDetail") || undefined,
      postalCode: formReq(formData, "postalCode") || undefined,
      website: formReq(formData, "website") || undefined,
      description: formReq(formData, "description") || undefined,
      termsAccepted: formData.get("termsAccepted") === "on",
      privacyAccepted: formData.get("privacyAccepted") === "on",
      signupVerificationToken: formReq(formData, "signupVerificationToken"),
      attachments: parseAttachments(formData),
    });
    return actionSuccess({ id: row.id });
  });
}

export async function approveAssociationApplicationAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ inviteUrl: string; organizerId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const res = await associationApplicationService.approve(
      actor,
      formReq(formData, "applicationId"),
      formReq(formData, "reviewMemo") || undefined,
    );
    revalidatePath("/admin/association-applications");
    return actionSuccess({
      inviteUrl: res.inviteUrl,
      organizerId: res.organizerId,
    });
  });
}

export async function rejectAssociationApplicationAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor();
  await associationApplicationService.reject(
    actor,
    formReq(formData, "applicationId"),
    formReq(formData, "reviewMemo") || undefined,
  );
  revalidatePath("/admin/association-applications");
}

export async function checkAssociationOwnerInviteLoginIdAction(
  loginId: string,
): Promise<ActionResult<{ available: boolean; loginId: string; message?: string }>> {
  return mapCaught(async () => {
    const res =
      await associationApplicationService.isLoginIdAvailableForInvite(loginId);
    return actionSuccess(res);
  });
}

export async function acceptAssociationOwnerInviteAction(
  formData: FormData,
): Promise<
  ActionResult<{ loginId: string; alreadyActive: boolean }>
> {
  return mapCaught(async () => {
    const res = await associationApplicationService.acceptOwnerInvite(
      formReq(formData, "token"),
      {
        loginId: formReq(formData, "loginId"),
        password: String(formData.get("password") ?? ""),
        passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
      },
    );
    return actionSuccess(res);
  });
}

export async function getAssociationApplicationAttachmentDownloadAction(
  attachmentId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    const res =
      await associationApplicationUploadService.getAttachmentDownloadUrl(
        actor,
        attachmentId,
      );
    return actionSuccess({ signedUrl: res.signedUrl });
  });
}
