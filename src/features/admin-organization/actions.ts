"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { GymStatus, OrganizerStatus } from "@/lib/enums";
import {
  MUTABLE_GYM_STATUSES,
  MUTABLE_ORGANIZER_STATUSES,
  ORGANIZATION_STATUS_REASON_MIN_LENGTH,
} from "@/lib/organization-platform-status";
import { adminOrganizationStatusService } from "@/lib/services/admin-organization-status.service";

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

const statusChangeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(
      ORGANIZATION_STATUS_REASON_MIN_LENGTH,
      `사유는 ${ORGANIZATION_STATUS_REASON_MIN_LENGTH}자 이상 입력해 주세요.`,
    ),
  adminMemo: z.string().trim().optional(),
});

const organizerStatusSchema = statusChangeSchema.extend({
  organizerId: z.string().min(1),
  nextStatus: z.enum(MUTABLE_ORGANIZER_STATUSES),
});

const gymStatusSchema = statusChangeSchema.extend({
  gymId: z.string().min(1),
  nextStatus: z.enum(MUTABLE_GYM_STATUSES),
});

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function adminUpdateOrganizerStatusAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ status: OrganizerStatus }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = organizerStatusSchema.safeParse({
      organizerId: formReq(formData, "organizerId"),
      nextStatus: formReq(formData, "nextStatus"),
      reason: formReq(formData, "reason"),
      adminMemo: formReq(formData, "adminMemo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await adminOrganizationStatusService.updateOrganizerStatus(
      actor,
      parsed.data,
    );

    revalidatePath("/admin/associations");
    revalidatePath(`/admin/associations/${parsed.data.organizerId}`);

    return actionSuccess(result);
  });
}

export async function adminUpdateGymStatusAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ status: GymStatus }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymStatusSchema.safeParse({
      gymId: formReq(formData, "gymId"),
      nextStatus: formReq(formData, "nextStatus"),
      reason: formReq(formData, "reason"),
      adminMemo: formReq(formData, "adminMemo") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await adminOrganizationStatusService.updateGymStatus(
      actor,
      parsed.data,
    );

    revalidatePath("/admin/gyms");
    revalidatePath(`/admin/gyms/${parsed.data.gymId}`);

    return actionSuccess(result);
  });
}
