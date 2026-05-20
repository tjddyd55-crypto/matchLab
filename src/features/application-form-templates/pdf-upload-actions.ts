"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { APPLICATION_FORM_PDF_MAX_BYTES } from "@/lib/constants/application-form-pdf-upload";
import { applicationPdfAccessService } from "@/lib/services/application-pdf-access.service";
import {
  APPLICATION_FORM_PDF_UPLOAD_EXPIRES_SEC,
  createApplicationFormTemplatePdfUploadUrl,
} from "@/lib/services/upload.service";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function requestApplicationFormTemplatePdfUploadAction(
  formData: FormData,
): Promise<
  ActionResult<{
    uploadUrl: string;
    path: string;
    expiresIn: number;
    maxBytes: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const templateId = formReq(formData, "templateId") || undefined;
    const mimeType = formReq(formData, "mimeType");
    if (!mimeType) {
      return actionFailure("VALIDATION_ERROR", "PDF 형식이 필요합니다.");
    }
    const result = await createApplicationFormTemplatePdfUploadUrl(actor, {
      templateId,
      mimeType,
    });
    return actionSuccess({
      ...result,
      expiresIn: APPLICATION_FORM_PDF_UPLOAD_EXPIRES_SEC,
      maxBytes: APPLICATION_FORM_PDF_MAX_BYTES,
    });
  });
}

export async function getApplicationFormTemplatePdfViewUrlAction(
  formData: FormData,
): Promise<
  ActionResult<{ viewUrl: string; expiresIn: number; fileName: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const templateId = formReq(formData, "templateId");
    if (!templateId) {
      return actionFailure("VALIDATION_ERROR", "템플릿 ID가 필요합니다.");
    }
    const result = await applicationPdfAccessService.getTemplatePdfViewUrl(
      actor,
      templateId,
    );
    return actionSuccess(result);
  });
}

export async function getApplicationFormTemplatePdfViewUrlByPathAction(
  formData: FormData,
): Promise<
  ActionResult<{ viewUrl: string; expiresIn: number; fileName: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const path = formReq(formData, "path");
    const fileName = formReq(formData, "fileName") || "template.pdf";
    if (!path) {
      return actionFailure("VALIDATION_ERROR", "PDF 경로가 필요합니다.");
    }
    const result = await applicationPdfAccessService.getTemplatePdfViewUrlByPath(
      actor,
      path,
      fileName,
    );
    return actionSuccess(result);
  });
}

export async function getApplicationDocumentGeneratedPdfViewUrlAction(
  formData: FormData,
): Promise<
  ActionResult<{ viewUrl: string; expiresIn: number; fileName: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const documentId = formReq(formData, "documentId");
    if (!eventId || !documentId) {
      return actionFailure("VALIDATION_ERROR", "문서 정보가 필요합니다.");
    }
    const result =
      await applicationPdfAccessService.getDocumentGeneratedPdfViewUrl(
        actor,
        eventId,
        documentId,
      );
    return actionSuccess(result);
  });
}
