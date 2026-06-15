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
import { eventCourtService } from "@/lib/services/event-court.service";

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

function revalidateEventPaths(eventId: string) {
  revalidatePath(`/organizer/events/${eventId}/schedule`);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
  revalidatePath(`/organizer/events/${eventId}/operation`);
}

export async function createEventCourtFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const name = formReq(formData, "name");
    if (!eventId || !name) {
      return actionFailure("VALIDATION_ERROR", "경기장 이름을 입력해 주세요.");
    }
    await eventCourtService.createCourt(actor, eventId, name);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function assignCourtDivisionFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const courtId = formReq(formData, "courtId");
    const divisionId = formReq(formData, "divisionId");
    if (!eventId || !courtId || !divisionId) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await eventCourtService.assignDivision(actor, eventId, courtId, divisionId);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function saveMatchScheduleFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const payloadRaw = formReq(formData, "updates");
    if (!eventId || !payloadRaw) {
      return actionFailure("VALIDATION_ERROR", "저장할 순서가 없습니다.");
    }
    let updates: { matchId: string; courtId: string | null; courtOrder: number | null }[];
    try {
      updates = JSON.parse(payloadRaw) as typeof updates;
    } catch {
      return actionFailure("VALIDATION_ERROR", "순서 데이터 형식이 올바르지 않습니다.");
    }
    await eventCourtService.updateMatchSchedule(actor, eventId, updates);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function deactivateEventCourtFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const courtId = formReq(formData, "courtId");
    if (!eventId || !courtId) {
      return actionFailure("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }
    await eventCourtService.deactivateCourt(actor, eventId, courtId);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}
