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
import {
  intakeFormPublicService,
  intakeFormService,
} from "@/lib/services/intake-form.service";
import { intakeFormExcelExportService } from "@/lib/services/intake-form-excel-export.service";
import {
  intakeFormSubmissionStatusSchema,
  intakeFormUpsertSchema,
} from "@/lib/validators/intake-form.validator";

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

function revalidateIntakeFormPaths(formId?: string) {
  revalidatePath("/organizer/intake-forms");
  if (formId) {
    revalidatePath(`/organizer/intake-forms/${formId}`);
    revalidatePath(`/organizer/intake-forms/${formId}/edit`);
  }
}

export async function createIntakeFormAction(
  input: unknown,
  duplicateFromId?: string | null,
): Promise<ActionResult<{ formId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = intakeFormUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const created = await intakeFormService.createForOrganizer(
      actor,
      parsed.data,
      duplicateFromId,
    );
    revalidateIntakeFormPaths(created.id);
    return actionSuccess({ formId: created.id });
  });
}

export async function updateIntakeFormAction(
  formId: string,
  input: unknown,
): Promise<ActionResult<{ formId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = intakeFormUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await intakeFormService.updateForOrganizer(actor, formId, parsed.data);
    revalidateIntakeFormPaths(formId);
    return actionSuccess({ formId });
  });
}

export async function setIntakeFormStatusAction(
  formId: string,
  status: "DRAFT" | "OPEN" | "CLOSED",
): Promise<ActionResult<{ formId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await intakeFormService.setStatusForOrganizer(actor, formId, status);
    revalidateIntakeFormPaths(formId);
    return actionSuccess({ formId });
  });
}

export async function archiveIntakeFormAction(
  formId: string,
): Promise<ActionResult<{ formId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await intakeFormService.archiveForOrganizer(actor, formId);
    revalidateIntakeFormPaths(formId);
    return actionSuccess({ formId });
  });
}

export async function updateIntakeFormSubmissionStatusAction(
  formId: string,
  submissionId: string,
  input: unknown,
): Promise<ActionResult<{ submissionId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = intakeFormSubmissionStatusSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "상태값을 확인해 주세요.");
    }
    await intakeFormService.updateSubmissionStatus(
      actor,
      formId,
      submissionId,
      parsed.data.status,
      parsed.data.adminMemo,
    );
    revalidateIntakeFormPaths(formId);
    return actionSuccess({ submissionId });
  });
}

export async function exportIntakeFormSubmissionsExcelAction(
  formId: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const { buffer, filename } =
      await intakeFormExcelExportService.buildSubmissionsWorkbook(actor, formId);
    return actionSuccess({
      base64: buffer.toString("base64"),
      filename,
    });
  });
}

export async function submitPublicIntakeFormAction(
  publicToken: string,
  answers: Record<string, unknown>,
): Promise<ActionResult<{ completionMessage: string }>> {
  return mapCaught(async () => {
    const result = await intakeFormPublicService.submit(publicToken, answers);
    return actionSuccess({ completionMessage: result.completionMessage });
  });
}
