"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionFailure,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationService } from "@/lib/services/application.service";
import {
  applyToEventSchema,
  approveApplicationSchema,
  revokeApplicationApprovalSchema,
  rejectApplicationSchema,
  type ApplyToEventInput,
} from "@/lib/validators/application.validator";
import type {
  ApplyToEventSuccessDTO,
  BulkApplyToEventSuccessDTO,
  CreateOrganizerManualApplicationResultDTO,
  ResolveOtherDivisionResultDTO,
} from "@/lib/services/application.service";
import type {
  ApplicantExcelCommitResult,
  ApplicantExcelPreview,
} from "@/lib/applicant-excel/types";
import {
  organizerManualApplicationSchema,
} from "@/lib/validators/organizer-manual-application.validator";
import { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import {
  logManualApplicationCreate,
  logManualApplicationCreateError,
  maskPhoneLast4,
} from "@/lib/applications/manual-application-create-log";
import { sanitizeApplicantExcelPreviewForClient } from "@/lib/applicant-excel/analyze";
import { sanitizePiiForLog } from "@/lib/athlete-application/sanitize-pii-log";
import {
  bulkApplyToEventSchema,
  type BulkApplyToEventInput,
} from "@/lib/validators/bulk-application.validator";
import { applicationOrganizerLifecycleService } from "@/lib/services/application-organizer-lifecycle.service";

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

function formOpt(formData: FormData, key: string): string | undefined {
  const v = formReq(formData, key);
  return v === "" ? undefined : v;
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
      fighterId: formReq(formData, "fighterId"),
      applicationWeightKg: Number(formReq(formData, "applicationWeightKg")),
      competitionCategory: formReq(formData, "competitionCategory"),
      discipline: formReq(formData, "discipline") || undefined,
      schoolGradeSelect: formReq(formData, "schoolGradeSelect") || "",
      applicationProfileImageUrl:
        formReq(formData, "applicationProfileImageUrl") || undefined,
      memo: formReq(formData, "memo") || undefined,
      recordText: formReq(formData, "recordText") || undefined,
      careerText: formReq(formData, "careerText") || undefined,
      residentRegistrationNumber: formReq(formData, "residentRegistrationNumber"),
      insuranceConsentAgreed: formData.get("insuranceConsentAgreed") === "on",
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
      insuranceConsentAgreed: formData.get("insuranceConsentAgreed") === "on",
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

function revalidateOrganizerApplicationPaths(eventId: string | undefined): void {
  if (!eventId) return;
  revalidatePath(`/organizer/events/${eventId}/applications`);
  revalidatePath(`/organizer/events/${eventId}/check-in`);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
}

export async function approveApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = approveApplicationSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      eventId: formOpt(formData, "eventId"),
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
    revalidateOrganizerApplicationPaths(parsed.data.eventId);
    return actionSuccess({ ok: true as const });
  });
}

export async function revokeApplicationApprovalAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = revokeApplicationApprovalSchema.safeParse({
      applicationId: formReq(formData, "applicationId"),
      eventId: formOpt(formData, "eventId"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "신청 정보가 올바르지 않습니다.",
      );
    }
    const actor = await requireActorFromMutation();
    await applicationService.revokeEventApplicationApproval(
      actor,
      parsed.data.applicationId,
    );
    revalidateOrganizerApplicationPaths(parsed.data.eventId);
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
      applicationWeightKg: Number(formReq(formData, "applicationWeightKg")),
      competitionCategory: formReq(formData, "competitionCategory"),
      discipline: formReq(formData, "discipline") || undefined,
      schoolGradeSelect: formReq(formData, "schoolGradeSelect") || "",
      manualDivisionOverride: parseCheckboxOn(formData, "manualDivisionOverride"),
      divisionId: formReq(formData, "divisionId") || undefined,
      gymMode,
      gymId: formReq(formData, "gymId") || undefined,
      gymName: formReq(formData, "gymName") || undefined,
      fighterName: formReq(formData, "fighterName"),
      gender: formReq(formData, "gender"),
      birthDate: formReq(formData, "birthDate") || undefined,
      phone: formReq(formData, "phone") || undefined,
      guardianName: formReq(formData, "guardianName") || undefined,
      guardianPhone: formReq(formData, "guardianPhone") || undefined,
      applicationStatus:
        formReq(formData, "applicationStatus") || ApplicationStatus.approved,
      paymentStatus:
        formReq(formData, "paymentStatus") || PaymentStatus.paid,
      memo: formReq(formData, "memo") || undefined,
      recordText: formReq(formData, "recordText") || undefined,
      careerText: formReq(formData, "careerText") || undefined,
      residentRegistrationNumber: formReq(formData, "residentRegistrationNumber"),
      insuranceConsentConfirmed: parseCheckboxOn(
        formData,
        "insuranceConsentConfirmed",
      ),
      confirmDuplicate: parseCheckboxOn(formData, "confirmDuplicate"),
      linkFighterId: formReq(formData, "linkFighterId") || undefined,
    };

    logManualApplicationCreate("action_received", sanitizePiiForLog({
      eventId: raw.eventId,
      divisionId: raw.divisionId,
      gymMode: raw.gymMode,
      phoneLast4: maskPhoneLast4(raw.phone),
    }) as Record<string, unknown>);

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

async function readExcelBuffer(formData: FormData): Promise<{
  fileName: string;
  buffer: Buffer;
} | ActionFailure> {
  const eventId = formReq(formData, "eventId");
  if (!eventId) {
    return actionFailure("VALIDATION_ERROR", "대회 정보가 없습니다.");
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return actionFailure("VALIDATION_ERROR", "Excel 파일을 선택해 주세요.");
  }
  return {
    fileName: file.name || "import.xlsx",
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function downloadOrganizerApplicantExcelSampleAction(
  eventId: string,
): Promise<ActionResult<{ filename: string; base64: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await applicationService.buildOrganizerApplicantExcelSample(
      actor,
      eventId,
    );
    return actionSuccess(data);
  });
}

export async function analyzeOrganizerApplicantExcelAction(
  formData: FormData,
): Promise<ActionResult<ApplicantExcelPreview>> {
  return mapCaught(async () => {
    const eventId = formReq(formData, "eventId");
    const file = await readExcelBuffer(formData);
    if ("ok" in file && file.ok === false) return file;
    const actor = await requireActorFromMutation();
    const preview = await applicationService.analyzeOrganizerApplicantExcel(
      actor,
      { eventId, ...(file as { fileName: string; buffer: Buffer }) },
    );
    return actionSuccess(sanitizeApplicantExcelPreviewForClient(preview));
  });
}

export async function commitOrganizerApplicantExcelAction(
  formData: FormData,
): Promise<ActionResult<ApplicantExcelCommitResult>> {
  return mapCaught(async () => {
    const eventId = formReq(formData, "eventId");
    const file = await readExcelBuffer(formData);
    if ("ok" in file && file.ok === false) return file;
    const actor = await requireActorFromMutation();
    const result = await applicationService.commitOrganizerApplicantExcel(
      actor,
      { eventId, ...(file as { fileName: string; buffer: Buffer }) },
    );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    revalidatePath(`/organizer/events/${eventId}/check-in`);
    revalidatePath(`/organizer/events/${eventId}/brackets`);
    return actionSuccess(result);
  });
}

export async function resolveOtherDivisionAction(
  applicationId: string,
  eventDivisionId: string,
  eventId: string,
): Promise<ActionResult<ResolveOtherDivisionResultDTO>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await applicationService.resolveOtherDivisionApplication(
      actor,
      { applicationId, eventDivisionId },
    );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    revalidatePath(`/organizer/events/${eventId}/check-in`);
    revalidatePath(`/organizer/events/${eventId}/brackets`);
    return actionSuccess(result);
  });
}

export async function getOrganizerApplicationEditFormAction(
  applicationId: string,
): Promise<
  ActionResult<
    import("@/lib/services/application-organizer-lifecycle.service").OrganizerApplicationEditFormDTO
  >
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await applicationOrganizerLifecycleService.getEditForm(
      actor,
      applicationId,
    );
    return actionSuccess(data);
  });
}

export async function updateOrganizerApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string }>> {
  return mapCaught(async () => {
    const gymModeRaw = formReq(formData, "gymMode");
    const gymMode =
      gymModeRaw === "manual" || gymModeRaw === "existing"
        ? gymModeRaw
        : "existing";

    const weightRaw = formReq(formData, "applicationWeightKg");
    const weightNum = Number(weightRaw);
    const divisionIdRaw = formReq(formData, "divisionId");
    // Matched/locked edits may omit weight; keep zod satisfied when division is pinned.
    const applicationWeightKg =
      Number.isFinite(weightNum) && weightNum > 0
        ? weightNum
        : divisionIdRaw
          ? 1
          : weightNum;

    const raw = {
      applicationId: formReq(formData, "applicationId"),
      eventId: formReq(formData, "eventId"),
      applicationWeightKg,
      competitionCategory:
        formReq(formData, "competitionCategory") || "open",
      discipline: formReq(formData, "discipline") || undefined,
      schoolGradeSelect: formReq(formData, "schoolGradeSelect") || "",
      manualDivisionOverride: parseCheckboxOn(formData, "manualDivisionOverride"),
      divisionId: divisionIdRaw || undefined,
      gymMode,
      gymId: formReq(formData, "gymId") || undefined,
      gymName: formReq(formData, "gymName") || undefined,
      fighterName: formReq(formData, "fighterName"),
      gender: formReq(formData, "gender"),
      birthDate: formReq(formData, "birthDate") || undefined,
      phone: formReq(formData, "phone") || undefined,
      guardianName: formReq(formData, "guardianName") || undefined,
      guardianPhone: formReq(formData, "guardianPhone") || undefined,
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.paid,
      memo: formReq(formData, "memo") || undefined,
      recordText: formReq(formData, "recordText") || undefined,
      careerText: formReq(formData, "careerText") || undefined,
      totalBouts: formReq(formData, "totalBouts") || undefined,
      wins: formReq(formData, "wins") || undefined,
      draws: formReq(formData, "draws") || undefined,
      losses: formReq(formData, "losses") || undefined,
      residentRegistrationNumber: formReq(formData, "residentRegistrationNumber"),
      insuranceConsentConfirmed: parseCheckboxOn(
        formData,
        "insuranceConsentConfirmed",
      ),
      clearInsuranceRrn: parseCheckboxOn(formData, "clearInsuranceRrn"),
      confirmDuplicate: false,
    };

    // Disabled gender <select> omits FormData — catch before opaque zod noise.
    if (!raw.gender) {
      return actionFailure(
        "VALIDATION_ERROR",
        "성별 정보가 전달되지 않았습니다. 페이지를 새로고침 후 다시 시도해 주세요.",
      );
    }

    const parsed = organizerManualApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const applicationId = formReq(formData, "applicationId");
    if (!applicationId) {
      return actionFailure("VALIDATION_ERROR", "신청 정보가 없습니다.");
    }

    const actor = await requireActorFromMutation();
    const result =
      await applicationOrganizerLifecycleService.updateOrganizerEventApplication(
        actor,
        {
          ...parsed.data,
          applicationId,
          clearInsuranceRrn: parseCheckboxOn(formData, "clearInsuranceRrn"),
        },
      );
    revalidatePath(`/organizer/events/${parsed.data.eventId}/applications`);
    revalidatePath(`/organizer/events/${parsed.data.eventId}/check-in`);
    revalidatePath(`/organizer/events/${parsed.data.eventId}/brackets`);
    return actionSuccess(result);
  });
}

export async function restoreOrganizerCancelledApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string; restoredStatus: string }>> {
  return mapCaught(async () => {
    const applicationId = formReq(formData, "applicationId");
    const eventId = formReq(formData, "eventId");
    if (!applicationId || !eventId) {
      return actionFailure("VALIDATION_ERROR", "신청 정보가 없습니다.");
    }
    const actor = await requireActorFromMutation();
    const result =
      await applicationOrganizerLifecycleService.restoreOrganizerCancelledApplication(
        actor,
        applicationId,
      );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(result);
  });
}

export async function restoreGymCancelledApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string; restoredStatus: string }>> {
  return mapCaught(async () => {
    const applicationId = formReq(formData, "applicationId");
    const eventId = formReq(formData, "eventId");
    if (!applicationId || !eventId) {
      return actionFailure("VALIDATION_ERROR", "신청 정보가 없습니다.");
    }
    const actor = await requireActorFromMutation();
    const result =
      await applicationOrganizerLifecycleService.restoreGymCancelledApplication(
        actor,
        applicationId,
      );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(result);
  });
}

export async function permanentlyDeleteOrganizerApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string; fighterDeleted: boolean }>> {
  return mapCaught(async () => {
    const applicationId = formReq(formData, "applicationId");
    const eventId = formReq(formData, "eventId");
    if (!applicationId || !eventId) {
      return actionFailure("VALIDATION_ERROR", "신청 정보가 없습니다.");
    }
    const actor = await requireActorFromMutation();
    const result =
      await applicationOrganizerLifecycleService.permanentlyDeleteOrganizerApplication(
        actor,
        applicationId,
      );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    revalidatePath(`/organizer/events/${eventId}/brackets`);
    revalidatePath(`/organizer/events/${eventId}/check-in`);
    return actionSuccess(result);
  });
}

export async function exportOrganizerApplicationsExcelAction(input: {
  eventId: string;
  fieldKeys: string[];
  scope: "all" | "filtered";
  applicationIds?: string[];
}): Promise<ActionResult<{ base64: string; filename: string; rowCount: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const { applicantExcelExportService } = await import(
      "@/lib/services/applicant-excel-export.service"
    );
    const { buffer, filename, rowCount } =
      await applicantExcelExportService.buildWorkbook(actor, {
        eventId: input.eventId,
        fieldKeys: input.fieldKeys,
        scope: input.scope,
        applicationIds: input.applicationIds,
      });
    return actionSuccess({
      base64: buffer.toString("base64"),
      filename,
      rowCount,
    });
  });
}
