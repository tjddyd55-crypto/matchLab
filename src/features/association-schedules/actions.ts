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
import { associationScheduleService } from "@/lib/services/association-schedule.service";
import { associationScheduleUpsertSchema } from "@/lib/validators/association-schedule.validator";

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

function revalidateSchedulePaths() {
  revalidatePath("/organizer/schedules");
  revalidatePath("/organizer/events");
}

export async function createAssociationScheduleAction(
  input: unknown,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = associationScheduleUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const row = await associationScheduleService.create(actor, parsed.data);
    revalidateSchedulePaths();
    if (parsed.data.relatedEventId) {
      revalidatePath(`/organizer/events/${parsed.data.relatedEventId}`);
    }
    return actionSuccess({ scheduleId: row.id });
  });
}

export async function updateAssociationScheduleAction(
  scheduleId: string,
  input: unknown,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = associationScheduleUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const row = await associationScheduleService.update(
      actor,
      scheduleId,
      parsed.data,
    );
    revalidateSchedulePaths();
    return actionSuccess({ scheduleId: row.id });
  });
}

export async function deleteAssociationScheduleAction(
  scheduleId: string,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await associationScheduleService.delete(actor, scheduleId);
    revalidateSchedulePaths();
    return actionSuccess({ scheduleId });
  });
}

export async function getEventSchedulePrefillAction(
  eventId: string,
): Promise<
  ActionResult<{
    prefill: Awaited<
      ReturnType<typeof associationScheduleService.getEventSchedulePrefill>
    >;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const prefill = await associationScheduleService.getEventSchedulePrefill(
      actor,
      eventId,
    );
    return actionSuccess({ prefill });
  });
}
