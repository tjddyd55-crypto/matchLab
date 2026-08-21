"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import {
  additionalInfoService,
  type AdditionalInfoBulkPreview,
  type AdditionalInfoRequestResult,
  type PublicAdditionalInfoFormDTO,
  type SubmitAdditionalInfoPayload,
} from "@/lib/services/additional-info.service";
import type { AdditionalInfoStatus } from "@/generated/prisma";

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
    }
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

export async function requestAdditionalInfoAction(
  applicationId: string,
  eventId?: string,
): Promise<ActionResult<AdditionalInfoRequestResult>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await additionalInfoService.requestOne(actor, applicationId);
    if (eventId) {
      revalidatePath(`/organizer/events/${eventId}/applications`);
    }
    return actionSuccess(result);
  });
}

export async function resendAdditionalInfoAction(
  applicationId: string,
  eventId?: string,
  refreshFromFighter?: boolean,
): Promise<ActionResult<AdditionalInfoRequestResult>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await additionalInfoService.requestOne(actor, applicationId, {
      resend: true,
      refreshFromFighter: refreshFromFighter === true,
    });
    if (eventId) {
      revalidatePath(`/organizer/events/${eventId}/applications`);
    }
    return actionSuccess(result);
  });
}

export async function previewAdditionalInfoBulkAction(
  eventId: string,
  mode: "adults" | "minors" | "ids",
  applicationIds?: string[],
): Promise<ActionResult<AdditionalInfoBulkPreview>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const preview = await additionalInfoService.previewBulk(
      actor,
      eventId,
      mode,
      applicationIds,
    );
    return actionSuccess(preview);
  });
}

export async function requestAdditionalInfoBulkAction(input: {
  eventId: string;
  mode: "adults" | "minors" | "ids";
  applicationIds?: string[];
}): Promise<
  ActionResult<{
    preview: AdditionalInfoBulkPreview;
    results: AdditionalInfoRequestResult[];
    successCount: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await additionalInfoService.requestBulk(actor, input.eventId, {
      mode: input.mode,
      applicationIds: input.applicationIds,
    });
    const successCount = result.results.filter((r) => r.ok).length;
    revalidatePath(`/organizer/events/${input.eventId}/applications`);
    return actionSuccess({
      preview: result.preview,
      results: result.results,
      successCount,
    });
  });
}

export async function getPublicAdditionalInfoFormAction(
  token: string,
): Promise<ActionResult<PublicAdditionalInfoFormDTO>> {
  return mapCaught(async () => {
    const form = await additionalInfoService.getPublicForm(token);
    return actionSuccess(form);
  });
}

export async function submitPublicAdditionalInfoAction(
  token: string,
  payload: SubmitAdditionalInfoPayload,
): Promise<ActionResult<{ applicationId: string; status: AdditionalInfoStatus }>> {
  return mapCaught(async () => {
    const result = await additionalInfoService.submitPublicForm(token, payload);
    return actionSuccess(result);
  });
}

export async function updateApplicantContactForAdditionalInfoAction(input: {
  applicationId: string;
  eventId: string;
  phone?: string | null;
  guardianPhone?: string | null;
}): Promise<ActionResult<{ applicationId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await additionalInfoService.updateApplicantContact(actor, input);
    revalidatePath(`/organizer/events/${input.eventId}/applications`);
    return actionSuccess({ applicationId: result.applicationId });
  });
}
