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
import { prismaErrorToActionFailure } from "@/lib/prisma-errors";
import { eventService } from "@/lib/services/event.service";
import {
  changeEventStatusSchema,
  createEventDivisionSchema,
  createEventSchema,
  deleteEventDivisionSchema,
  updateEventDivisionSchema,
  updateEventSchema,
  updateSpectatorAccessSchema,
  upsertEventPaymentSettingSchema,
} from "@/lib/validators/event.validator";

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
    const prismaFailure = prismaErrorToActionFailure(e);
    if (prismaFailure) return prismaFailure;
    console.error(e);
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
  });
}

/** `<form action>` 단일 인자 vs `useActionState(prev, formData)` 모두 지원 */
function resolveFormData(a: unknown, b?: FormData): FormData | null {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return null;
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** `<checkbox value="on" />` 뒤에 `<input type="hidden" value="off" />` 를 두는 패턴 */
function formToggle(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function optDateTime(formData: FormData, key: string): Date | undefined {
  const s = formReq(formData, key);
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function optDateTimeOrNull(
  formData: FormData,
  key: string,
): Date | null | undefined {
  const s = formReq(formData, key);
  if (s === "") return null;
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function createEventAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ id: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const posterRaw = formReq(formData, "posterUrl");
    const raw = {
      organizerId: formReq(formData, "organizerId") || undefined,
      title: formReq(formData, "title"),
      description: formReq(formData, "description") || null,
      location: null,
      roadAddress: formReq(formData, "roadAddress") || null,
      jibunAddress: formReq(formData, "jibunAddress") || null,
      detailAddress: formReq(formData, "detailAddress") || null,
      postalCode: formReq(formData, "postalCode") || null,
      locationName: formReq(formData, "locationName") || null,
      eventDate: new Date(formReq(formData, "eventDate")),
      registrationStartDate: new Date(
        formReq(formData, "registrationStartDate"),
      ),
      registrationEndDate: new Date(formReq(formData, "registrationEndDate")),
      posterUrl: posterRaw || null,
      photoRecordingEnabled: formToggle(formData, "photoRecordingEnabled"),
      videoRecordingEnabled: formToggle(formData, "videoRecordingEnabled"),
      liveStreamingEnabled: formToggle(formData, "liveStreamingEnabled"),
      streamingNoticeText: formReq(formData, "streamingNoticeText") || null,
      streamingConsentRequired: formToggle(formData, "streamingConsentRequired")
        ? true
        : undefined,
    };

    const parsed = createEventSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const actor = await requireActorFromMutation();
    const data = await eventService.createOrganizerEvent(actor, parsed.data);
    return actionSuccess(data);
  });
}

export async function updateEventAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const intent = formReq(formData, "intent");
    const eventId = formReq(formData, "eventId");
    if (!eventId) {
      return actionFailure("VALIDATION_ERROR", "대회 ID가 필요합니다.");
    }

    const raw: Record<string, unknown> = { eventId };

    if (intent === "basic") {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "[updateEventAction:basic] form keys:",
          [...formData.keys()].sort().join(", "),
        );
      }

      const title = formReq(formData, "title");
      if (title) raw.title = title;
      const description = formReq(formData, "description");
      if (formData.has("description")) {
        raw.description = description || null;
      }
      if (formData.has("roadAddress")) {
        raw.roadAddress = formReq(formData, "roadAddress") || null;
      }
      if (formData.has("jibunAddress")) {
        raw.jibunAddress = formReq(formData, "jibunAddress") || null;
      }
      if (formData.has("detailAddress")) {
        raw.detailAddress = formReq(formData, "detailAddress") || null;
      }
      if (formData.has("postalCode")) {
        raw.postalCode = formReq(formData, "postalCode") || null;
      }
      if (formData.has("locationName")) {
        raw.locationName = formReq(formData, "locationName") || null;
      }
      const ed = optDateTime(formData, "eventDate");
      if (ed) raw.eventDate = ed;
      const rs = optDateTime(formData, "registrationStartDate");
      if (rs) raw.registrationStartDate = rs;
      const re = optDateTime(formData, "registrationEndDate");
      if (re) raw.registrationEndDate = re;
      const posterRaw = formReq(formData, "posterUrl");
      if (formData.has("posterUrl")) {
        raw.posterUrl = posterRaw || null;
      }
    } else if (intent === "recording") {
      raw.photoRecordingEnabled = formToggle(formData, "photoRecordingEnabled");
      raw.videoRecordingEnabled = formToggle(formData, "videoRecordingEnabled");
      raw.liveStreamingEnabled = formToggle(formData, "liveStreamingEnabled");
      raw.streamingNoticeText = formReq(formData, "streamingNoticeText") || null;
      raw.streamingConsentRequired = formToggle(
        formData,
        "streamingConsentRequired",
      );
    } else {
      return actionFailure("VALIDATION_ERROR", "알 수 없는 저장 구분입니다.");
    }

    const parsed = updateEventSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const actor = await requireActorFromMutation();
    await eventService.updateOrganizerEvent(actor, parsed.data);
    revalidatePath(`/organizer/events/${parsed.data.eventId}`);
    return actionSuccess({ ok: true as const });
  });
}

export async function changeEventStatusAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = changeEventStatusSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      status: formReq(formData, "status"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await eventService.changeEventStatus(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function createEventDivisionAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ divisionId: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = createEventDivisionSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      sportType: formReq(formData, "sportType"),
      ruleType: formReq(formData, "ruleType") || null,
      gender: formReq(formData, "gender") || null,
      ageGroup: formReq(formData, "ageGroup") || null,
      weightClass: formReq(formData, "weightClass") || null,
      skillLevel: formReq(formData, "skillLevel") || null,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    const data = await eventService.createEventDivision(actor, parsed.data);
    return actionSuccess(data);
  });
}

export async function updateEventDivisionAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const raw: Record<string, unknown> = {
      divisionId: formReq(formData, "divisionId"),
    };
    const sportType = formReq(formData, "sportType");
    if (sportType) raw.sportType = sportType;
    if (formData.has("ruleType")) {
      raw.ruleType = formReq(formData, "ruleType") || null;
    }
    if (formData.has("gender")) {
      raw.gender = formReq(formData, "gender") || null;
    }
    if (formData.has("ageGroup")) {
      raw.ageGroup = formReq(formData, "ageGroup") || null;
    }
    if (formData.has("weightClass")) {
      raw.weightClass = formReq(formData, "weightClass") || null;
    }
    if (formData.has("skillLevel")) {
      raw.skillLevel = formReq(formData, "skillLevel") || null;
    }

    const parsed = updateEventDivisionSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await eventService.updateEventDivision(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function deleteEventDivisionAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = deleteEventDivisionSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      divisionId: formReq(formData, "divisionId"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await eventService.deleteEventDivision(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function upsertEventPaymentSettingAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const feeRaw = formReq(formData, "feeAmount");
    const feeAmount = Number(feeRaw);
    const paymentDueDate = optDateTimeOrNull(formData, "paymentDueDate");

    const raw = {
      eventId: formReq(formData, "eventId"),
      feeAmount,
      bankName: formReq(formData, "bankName"),
      accountNumber: formReq(formData, "accountNumber"),
      accountHolder: formReq(formData, "accountHolder"),
      depositorRule: formReq(formData, "depositorRule") || null,
      paymentDueDate:
        paymentDueDate === undefined ? null : paymentDueDate,
    };

    const parsed = upsertEventPaymentSettingSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await eventService.upsertEventPaymentSetting(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function updateSpectatorAccessAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const raw = {
      eventId: formReq(formData, "eventId"),
      spectatorAccessEnabled: formToggle(formData, "spectatorAccessEnabled"),
      spectatorAccessStartAt: optDateTimeOrNull(
        formData,
        "spectatorAccessStartAt",
      ),
      spectatorAccessEndAt: optDateTimeOrNull(
        formData,
        "spectatorAccessEndAt",
      ),
    };

    const parsed = updateSpectatorAccessSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "관람 공개 설정을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const actor = await requireActorFromMutation();
    await eventService.updateSpectatorAccess(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}
