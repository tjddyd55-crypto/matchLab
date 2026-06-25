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
import { applicationService } from "@/lib/services/application.service";
import {
  applyToEventSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  type ApplyToEventInput,
} from "@/lib/validators/application.validator";
import type {
  ApplyToEventSuccessDTO,
  BulkApplyToEventSuccessDTO,
  CreateOrganizerManualApplicationResultDTO,
} from "@/lib/services/application.service";
import {
  organizerManualApplicationSchema,
} from "@/lib/validators/organizer-manual-application.validator";
import { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import {
  logManualApplicationCreate,
  logManualApplicationCreateError,
  maskPhoneLast4,
} from "@/lib/applications/manual-application-create-log";
import {
  bulkApplyToEventSchema,
  type BulkApplyToEventInput,
} from "@/lib/validators/bulk-application.validator";

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
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function applyToEventAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<ApplyToEventSuccessDTO>> {
  return mapCaught(async () => {
    const streamingRequired =
      formReq(formData, "streamingAgreementRequired") === "1";

    const agreements = parseAgreementsFromFormData(
      formData,
      streamingRequired,
    );

    const raw: ApplyToEventInput = {
      eventId: formReq(formData, "eventId"),
      divisionId: formReq(formData, "divisionId"),
      fighterId: formReq(formData, "fighterId"),
      applicationProfileImageUrl:
        formReq(formData, "applicationProfileImageUrl") || undefined,
      memo: formReq(formData, "memo") || undefined,
      agreements,
    };

    const parsed = applyToEventSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const actor = await requireActorFromMutation();
    const data = await applicationService.applyToEventAsGym(actor, parsed.data);
    return actionSuccess(data);
  });
}

function parseAgreementsFromFormData(
  formData: FormData,
  streamingRequired: boolean,
): ApplyToEventInput["agreements"] {
  const agreements: ApplyToEventInput["agreements"] = {
    rulesAgreed: formData.get("rulesAgreed") === "on",
    privacyAgreed: formData.get("privacyAgreed") === "on",
    resultDisclosureAgreed: formData.get("resultDisclosureAgreed") === "on",
    photoVideoAgreed: formData.get("photoVideoAgreed") === "on",
  };
  if (streamingRequired) {
    agreements.streamingAgreed = formData.get("streamingAgreed") === "on";
  }
  return agreements;
}

export async function createBulkEventApplicationsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<BulkApplyToEventSuccessDTO>> {
  return mapCaught(async () => {
    const streamingRequired =
      formReq(formData, "streamingAgreementRequired") === "1";

    let applications: BulkApplyToEventInput["applications"] = [];
    const applicationsJson = formReq(formData, "applicationsJson");
    if (applicationsJson) {
      try {
        const parsedJson = JSON.parse(applicationsJson) as unknown;
        if (Array.isArray(parsedJson)) {
          applications = parsedJson as BulkApplyToEventInput["applications"];
        }
      } catch {
        return actionFailure(
          "VALIDATION_ERROR",
          "신청 목록 형식이 올바르지 않습니다.",
        );
      }
    }

    const raw: BulkApplyToEventInput = {
      eventId: formReq(formData, "eventId"),
      applications,
      memo: formReq(formData, "memo") || undefined,
      agreements: parseAgreementsFromFormData(formData, streamingRequired),
    };

    const parsed = bulkApplyToEventSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const actor = await requireActorFromMutation();
    const data = await applicationService.bulkApplyToEventAsGym(
      actor,
      parsed.data,
    );
    return actionSuccess(data);
  });
}

export async function approveApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = approveApplicationSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "신청 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await applicationService.approveEventApplication(
      actor,
      parsed.data.applicationId,
    );
    return actionSuccess({ ok: true as const });
  });
}

export async function rejectApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = rejectApplicationSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "신청 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await applicationService.rejectEventApplication(
      actor,
      parsed.data.applicationId,
      parsed.data.reason,
    );
    return actionSuccess({ ok: true as const });
  });
}

/** `<form action>` 용 — 반환 타입을 `void`로 맞춘다. */
export async function approveApplicationFormAction(
  formData: FormData,
): Promise<void> {
  await approveApplicationAction(formData);
}

export async function rejectApplicationFormAction(
  formData: FormData,
): Promise<void> {
  await rejectApplicationAction(formData);
}

function parseCheckboxOn(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export async function createOrganizerManualApplicationAction(
  formData: FormData,
): Promise<ActionResult<CreateOrganizerManualApplicationResultDTO>> {
  return mapCaught(async () => {
    const gymModeRaw = formReq(formData, "gymMode");
    const gymMode =
      gymModeRaw === "manual" || gymModeRaw === "existing"
        ? gymModeRaw
        : "existing";

    const raw = {
      eventId: formReq(formData, "eventId"),
      divisionId: formReq(formData, "divisionId"),
      gymMode,
      gymId: formReq(formData, "gymId") || undefined,
      gymName: formReq(formData, "gymName") || undefined,
      fighterName: formReq(formData, "fighterName"),
      gender: formReq(formData, "gender"),
      birthDate: formReq(formData, "birthDate"),
      phone: formReq(formData, "phone") || undefined,
      guardianName: formReq(formData, "guardianName") || undefined,
      guardianPhone: formReq(formData, "guardianPhone") || undefined,
      applicationStatus:
        formReq(formData, "applicationStatus") || ApplicationStatus.approved,
      paymentStatus:
        formReq(formData, "paymentStatus") || PaymentStatus.paid,
      memo: formReq(formData, "memo") || undefined,
      confirmDuplicate: parseCheckboxOn(formData, "confirmDuplicate"),
      linkFighterId: formReq(formData, "linkFighterId") || undefined,
    };

    logManualApplicationCreate("action_received", {
      eventId: raw.eventId,
      divisionId: raw.divisionId,
      gymMode: raw.gymMode,
      phoneLast4: maskPhoneLast4(raw.phone),
    });

    const parsed = organizerManualApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      logManualApplicationCreateError("action_validation_failed", {
        eventId: raw.eventId,
        message: parsed.error.issues[0]?.message,
      });
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }

    const actor = await requireActorFromMutation();
    const result = await applicationService.createOrganizerManualApplication(
      actor,
      parsed.data,
    );

    revalidatePath(`/organizer/events/${parsed.data.eventId}/applications`);
    revalidatePath(`/organizer/events/${parsed.data.eventId}/check-in`);

    logManualApplicationCreate("action_success", {
      eventId: parsed.data.eventId,
      applicationId: result.applicationId,
      fighterId: result.fighterId,
      gymId: result.gymId,
    });

    return actionSuccess(result);
  });
}
