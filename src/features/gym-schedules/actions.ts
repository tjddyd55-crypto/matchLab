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
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import {
  gymScheduleCancelSchema,
  gymScheduleCreateSchema,
  gymScheduleUpdateSchema,
} from "@/lib/validators/gym-schedule.validator";

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
    console.error("[gym-schedule]", e instanceof Error ? e.message : "error");
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
  "gymStaffId",
  "gymMemberId",
  "dateKey",
  "startHm",
  "endHm",
  "scheduleType",
  "title",
  "location",
  "memo",
  "colorKey",
] as const;

function revalidateSchedulePaths(extra?: {
  memberId?: string;
  staffId?: string;
}) {
  revalidatePath("/gym");
  revalidatePath("/gym/schedules");
  revalidatePath("/gym/schedules/my");
  if (extra?.memberId) revalidatePath(`/gym/members/${extra.memberId}`);
  if (extra?.staffId) revalidatePath(`/gym/staff/${extra.staffId}`);
}

export async function createGymScheduleAction(
  formData: FormData,
): Promise<ActionResult<{ scheduleId: string; notAssignedHint: boolean }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymScheduleCreateSchema.safeParse(
      formObj(formData, [...CREATE_KEYS]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymScheduleService.createSchedule(actor, parsed.data);
    revalidateSchedulePaths({
      memberId: parsed.data.gymMemberId,
      staffId: parsed.data.gymStaffId,
    });
    return actionSuccess(result);
  });
}

export async function updateGymScheduleAction(
  scheduleId: string,
  formData: FormData,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymScheduleUpdateSchema.safeParse(
      formObj(formData, [...CREATE_KEYS]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymScheduleService.updateSchedule(
      actor,
      scheduleId,
      parsed.data,
    );
    revalidateSchedulePaths({
      memberId: parsed.data.gymMemberId,
      staffId: parsed.data.gymStaffId,
    });
    return actionSuccess(result);
  });
}

export async function rescheduleGymScheduleAction(
  scheduleId: string,
  formData: FormData,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const dateKey = String(formData.get("dateKey") ?? "").trim();
    const startHm = String(formData.get("startHm") ?? "").trim();
    const endHm = String(formData.get("endHm") ?? "").trim();
    if (!dateKey || !startHm || !endHm) {
      return actionFailure("VALIDATION_ERROR", "일정 시간을 확인해 주세요.");
    }
    const result = await gymScheduleService.rescheduleSchedule(
      actor,
      scheduleId,
      { dateKey, startHm, endHm },
    );
    revalidateSchedulePaths();
    return actionSuccess(result);
  });
}

export async function completeGymScheduleAction(
  scheduleId: string,
): Promise<ActionResult<{ scheduleId: string; status: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymScheduleService.completeSchedule(actor, scheduleId);
    revalidateSchedulePaths();
    return actionSuccess(result);
  });
}

export async function markGymScheduleNoShowAction(
  scheduleId: string,
): Promise<ActionResult<{ scheduleId: string; status: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const result = await gymScheduleService.markNoShow(actor, scheduleId);
    revalidateSchedulePaths();
    return actionSuccess(result);
  });
}

export async function cancelGymScheduleAction(
  scheduleId: string,
  formData: FormData,
): Promise<ActionResult<{ scheduleId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymScheduleCancelSchema.safeParse({
      reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymScheduleService.cancelSchedule(
      actor,
      scheduleId,
      parsed.data.reason,
    );
    revalidateSchedulePaths();
    return actionSuccess(result);
  });
}
