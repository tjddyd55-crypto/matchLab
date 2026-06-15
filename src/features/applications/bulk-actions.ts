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
  applicationOrganizerBulkService,
  type BulkApplicationAction,
  type BulkApplicationResult,
} from "@/lib/services/application-organizer-bulk.service";

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

export async function bulkApplicationActionFormAction(
  formData: FormData,
): Promise<ActionResult<BulkApplicationResult>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = String(formData.get("eventId") ?? "").trim();
    const action = String(formData.get("action") ?? "").trim() as BulkApplicationAction;
    const gymId = String(formData.get("gymId") ?? "").trim() || null;
    const idsRaw = String(formData.get("applicationIds") ?? "").trim();
    const applicationIds = idsRaw
      ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (!eventId || !action || applicationIds.length === 0) {
      return actionFailure("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }

    const result = gymId
      ? await applicationOrganizerBulkService.bulkByGym(
          actor,
          eventId,
          gymId,
          action,
          { applicationIds },
        )
      : await applicationOrganizerBulkService.bulkByApplicationIds(
          actor,
          eventId,
          applicationIds,
          action,
        );

    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(result);
  });
}
