"use server";

import { GymApplicationAttachmentType } from "@/lib/enums";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymApplicationService } from "@/lib/services/gym-application.service";
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
      !Object.values(GymApplicationAttachmentType).includes(
        attachmentType as GymApplicationAttachmentType,
      )
    ) {
      throw new AppError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다.");
    }
    return {
      attachmentType: attachmentType as GymApplicationAttachmentType,
      storagePath: String(row.storagePath ?? ""),
      originalFileName: String(row.originalFileName ?? ""),
      mimeType: String(row.mimeType ?? ""),
      sizeBytes: Number(row.sizeBytes ?? 0),
    };
  });
}

export async function submitGymApplicationAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ applicationId: string }>> {
  return mapCaught(async () => {
    const created = await gymApplicationService.submit({
      gymName: formReq(formData, "gymName"),
      representativeName: formReq(formData, "representativeName"),
      contactName: formReq(formData, "contactName") || formReq(formData, "representativeName"),
      phone: formReq(formData, "phone") || undefined,
      mobilePhone: formReq(formData, "mobilePhone"),
      email: formReq(formData, "email"),
      postalCode: formReq(formData, "postalCode") || undefined,
      address: formReq(formData, "address") || undefined,
      addressDetail: formReq(formData, "addressDetail") || undefined,
      businessNo: formReq(formData, "businessNo") || undefined,
      sportType: formReq(formData, "sportType") || undefined,
      description: formReq(formData, "description") || undefined,
      privacyConsent: formData.get("privacyConsent") === "on",
      registrationConsent: formData.get("registrationConsent") === "on",
      smsConsent: formData.get("smsConsent") === "on",
      informationConsent: formData.get("informationConsent") === "on",
      signatureName: formReq(formData, "signatureName"),
      signatureConsent: formData.get("signatureConsent") === "on",
      uploadBatchId: formReq(formData, "uploadBatchId") || undefined,
      signupVerificationToken: formReq(formData, "signupVerificationToken"),
      attachments: parseAttachments(formData),
    });
    return actionSuccess({ applicationId: created.id });
  });
}

export async function rejectGymApplicationAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor();
  const applicationId = formReq(formData, "applicationId");
  await gymApplicationService.reject(
    actor,
    applicationId,
    formReq(formData, "reviewMemo") || undefined,
  );
  revalidatePath("/admin/gym-applications");
  revalidatePath(`/admin/gym-applications/${applicationId}`);
}
