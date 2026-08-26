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
import { validateMatchOrganizerMemo } from "@/lib/brackets/match-organizer-memo";
import { bracketService } from "@/lib/services/bracket.service";
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

function revalidateEventPaths(eventId: string, bracketId?: string) {
  revalidatePath(`/organizer/events/${eventId}/schedule`);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
  revalidatePath(`/organizer/events/${eventId}/operation`);
  revalidatePath(`/organizer/events/${eventId}/check-in`);
  if (bracketId) {
    revalidatePath(`/organizer/events/${eventId}/brackets/${bracketId}`);
  }
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

export async function updateEventCourtNameFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const courtId = formReq(formData, "courtId");
    const name = formReq(formData, "name");
    if (!eventId || !courtId || !name) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await eventCourtService.updateCourtName(actor, eventId, courtId, name);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function reorderEventCourtsFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const orderedIdsRaw = formReq(formData, "orderedCourtIds");
    if (!eventId || !orderedIdsRaw) {
      return actionFailure("VALIDATION_ERROR", "순서 정보가 없습니다.");
    }
    const orderedCourtIds = orderedIdsRaw.split(",").filter(Boolean);
    await eventCourtService.reorderCourts(actor, eventId, orderedCourtIds);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function assignCourtRuleFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const courtId = formReq(formData, "courtId");
    const divisionId = formReq(formData, "divisionId") || null;
    const weightClassLabel = formReq(formData, "weightClassLabel") || null;
    if (!eventId || !courtId) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    await eventCourtService.assignRule(actor, eventId, courtId, {
      divisionId,
      weightClassLabel,
    });
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
    await eventCourtService.assignRule(actor, eventId, courtId, { divisionId });
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function removeCourtRuleFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const ruleId = formReq(formData, "ruleId");
    if (!eventId || !ruleId) {
      return actionFailure("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }
    await eventCourtService.removeRule(actor, eventId, ruleId);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}

export async function setMatchCourtFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const matchId = formReq(formData, "matchId");
    const courtIdRaw = formReq(formData, "courtId");
    const courtId = courtIdRaw || null;
    const courtOrderRaw = formReq(formData, "courtOrder");
    const courtOrder =
      courtOrderRaw === "" ? null : Number.parseInt(courtOrderRaw, 10);
    if (!eventId || !matchId) {
      return actionFailure("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }
    if (!courtId) {
      return actionFailure("VALIDATION_ERROR", "경기장을 선택해 주세요.");
    }
    if (courtOrderRaw !== "" && Number.isNaN(courtOrder)) {
      return actionFailure("VALIDATION_ERROR", "경기 순서를 확인해 주세요.");
    }
    const organizerMemoRaw = formData.get("organizerMemo");
    const organizerMemoParsed = validateMatchOrganizerMemo(
      typeof organizerMemoRaw === "string" ? organizerMemoRaw : null,
    );
    if (!organizerMemoParsed.ok) {
      return actionFailure("VALIDATION_ERROR", organizerMemoParsed.message);
    }

    const targetDivisionIdRaw = formData.get("targetDivisionId");
    const targetDivisionId =
      typeof targetDivisionIdRaw === "string" && targetDivisionIdRaw.trim()
        ? targetDivisionIdRaw.trim()
        : null;
    const clearIncompatible =
      formData.get("clearIncompatibleFighters") === "on" ||
      formData.get("clearIncompatibleFighters") === "true";

    if (targetDivisionId) {
      await bracketService.changeMatchDivision(actor, {
        eventId,
        matchId,
        targetDivisionId,
        clearIncompatibleFighters: clearIncompatible,
      });
    }

    await eventCourtService.setMatchCourt(
      actor,
      eventId,
      matchId,
      courtId,
      courtOrder,
      organizerMemoParsed.value,
    );
    revalidateEventPaths(eventId, formReq(formData, "bracketId") || undefined);
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

export async function activateEventCourtFormAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const eventId = formReq(formData, "eventId");
    const courtId = formReq(formData, "courtId");
    if (!eventId || !courtId) {
      return actionFailure("VALIDATION_ERROR", "요청 정보가 올바르지 않습니다.");
    }
    await eventCourtService.activateCourt(actor, eventId, courtId);
    revalidateEventPaths(eventId);
    return actionSuccess({ ok: true });
  });
}
