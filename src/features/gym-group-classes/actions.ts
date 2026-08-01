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
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import {
  gymGroupClassAddParticipantSchema,
  gymGroupClassCancelSchema,
  gymGroupClassCreateSchema,
  gymGroupClassUpdateSchema,
} from "@/lib/validators/gym-group-class.validator";

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
        e.message || "권한이 없습니다.",
      );
    }
    console.error("[gym-group-class]", e instanceof Error ? e.message : "error");
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formObj(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === "string" ? value.trim() : "";
  }
  return out;
}

const CREATE_KEYS = [
  "title",
  "description",
  "instructorStaffId",
  "dateKey",
  "startHm",
  "endHm",
  "capacity",
  "location",
  "visibility",
  "colorKey",
] as const;

function revalidateGroupPaths(extra?: { classId?: string; memberId?: string }) {
  revalidatePath("/gym");
  revalidatePath("/gym/group-classes");
  revalidatePath("/gym/schedules");
  revalidatePath("/gym/schedules/my");
  if (extra?.classId) {
    revalidatePath(`/gym/group-classes/${extra.classId}`);
  }
  if (extra?.memberId) {
    revalidatePath(`/gym/members/${extra.memberId}`);
  }
}

export async function createGymGroupClassAction(
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  return mapCaught(async () => {
    await requireActorFromMutation();
    const parsed = gymGroupClassCreateSchema.safeParse(
      formObj(formData, [...CREATE_KEYS]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const actor = await requireActorFromMutation();
    const result = await gymGroupClassService.createClass(actor, parsed.data);
    revalidateGroupPaths({ classId: result.classId });
    return actionSuccess(result);
  });
}

export async function updateGymGroupClassAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymGroupClassUpdateSchema.safeParse(
      formObj(formData, [...CREATE_KEYS]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymGroupClassService.updateClass(
      actor,
      classId,
      parsed.data,
    );
    revalidateGroupPaths({ classId });
    return actionSuccess(result);
  });
}

export async function rescheduleGymGroupClassAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const dateKey = String(formData.get("dateKey") ?? "").trim();
    const startHm = String(formData.get("startHm") ?? "").trim();
    const endHm = String(formData.get("endHm") ?? "").trim();
    if (!dateKey || !startHm || !endHm) {
      return actionFailure("VALIDATION_ERROR", "수업 시간을 확인해 주세요.");
    }
    const result = await gymGroupClassService.rescheduleClass(actor, classId, {
      dateKey,
      startHm,
      endHm,
    });
    revalidateGroupPaths({ classId });
    return actionSuccess(result);
  });
}

export async function completeGymGroupClassAction(
  classId: string,
): Promise<ActionResult<{ classId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymGroupClassService.completeClass(actor, classId);
    revalidateGroupPaths({ classId });
    return actionSuccess(result);
  });
}

export async function cancelGymGroupClassAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymGroupClassCancelSchema.safeParse(
      formObj(formData, ["reason"]),
    );
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    const result = await gymGroupClassService.cancelClass(
      actor,
      classId,
      parsed.data.reason,
    );
    revalidateGroupPaths({ classId });
    return actionSuccess(result);
  });
}

export async function addGymGroupClassParticipantAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ status: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymGroupClassAddParticipantSchema.safeParse(
      formObj(formData, ["gymMemberId"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "회원을 선택해 주세요.",
      );
    }
    const result = await gymGroupClassService.addParticipant(
      actor,
      classId,
      parsed.data.gymMemberId,
    );
    revalidateGroupPaths({ classId, memberId: parsed.data.gymMemberId });
    return actionSuccess(result);
  });
}

export async function cancelGymGroupClassParticipantAction(
  classId: string,
  gymMemberId: string,
): Promise<ActionResult<{ promotedMemberId: string | null }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymGroupClassService.cancelParticipant(
      actor,
      classId,
      gymMemberId,
    );
    revalidateGroupPaths({ classId, memberId: gymMemberId });
    return actionSuccess(result);
  });
}

export async function promoteGymGroupClassParticipantAction(
  classId: string,
  gymMemberId: string,
): Promise<ActionResult<{ ok: boolean }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymGroupClassService.promoteParticipant(
      actor,
      classId,
      gymMemberId,
    );
    revalidateGroupPaths({ classId, memberId: gymMemberId });
    return actionSuccess(result);
  });
}

export async function moveGymGroupClassParticipantToWaitlistAction(
  classId: string,
  gymMemberId: string,
): Promise<ActionResult<{ ok: boolean }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymGroupClassService.moveToWaitlist(
      actor,
      classId,
      gymMemberId,
    );
    revalidateGroupPaths({ classId, memberId: gymMemberId });
    return actionSuccess(result);
  });
}
