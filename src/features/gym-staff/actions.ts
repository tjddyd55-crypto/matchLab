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
import { gymStaffService } from "@/lib/services/gym-staff.service";
import {
  gymStaffAssignmentCreateSchema,
  gymStaffCreateSchema,
  gymStaffUpdateSchema,
} from "@/lib/validators/gym-staff.validator";

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
    console.error("[gym-staff]", e instanceof Error ? e.message : "error");
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

const STAFF_FORM_KEYS = [
  "name",
  "phone",
  "email",
  "staffRole",
  "title",
  "colorKey",
] as const;

function revalidateStaffPaths(staffId?: string) {
  revalidatePath("/gym/staff");
  if (staffId) revalidatePath(`/gym/staff/${staffId}`);
}

export async function createGymStaffAction(
  formData: FormData,
): Promise<ActionResult<{ staffId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymStaffCreateSchema.safeParse(
      formObj(formData, [...STAFF_FORM_KEYS]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymStaffService.createStaff(actor, parsed.data);
    revalidateStaffPaths(result.staffId);
    return actionSuccess(result);
  });
}

export async function updateGymStaffAction(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymStaffUpdateSchema.safeParse(
      formObj(formData, [...STAFF_FORM_KEYS, "isActive"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymStaffService.updateStaff(actor, staffId, parsed.data);
    revalidateStaffPaths(staffId);
    return actionSuccess({ ok: true as const });
  });
}

export async function deactivateGymStaffAction(
  staffId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymStaffService.deactivateStaff(actor, staffId);
    revalidateStaffPaths(staffId);
    return actionSuccess({ ok: true as const });
  });
}

export async function searchGymStaffAssignableMembersAction(
  q: string,
): Promise<
  ActionResult<
    { id: string; name: string; memberNumber: string; phone: string }[]
  >
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const members = await gymStaffService.listAssignableMembers(
      actor,
      q.trim() || undefined,
    );
    return actionSuccess(members);
  });
}

export async function assignGymStaffMemberAction(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ assignmentId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymStaffAssignmentCreateSchema.safeParse(
      formObj(formData, ["gymMemberId", "assignmentType", "isPrimary", "memo"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymStaffService.assignMember(
      actor,
      staffId,
      parsed.data,
    );
    revalidateStaffPaths(staffId);
    revalidatePath(`/gym/members/${parsed.data.gymMemberId}`);
    return actionSuccess(result);
  });
}

export async function unassignGymStaffMemberAction(
  staffId: string,
  assignmentId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymStaffService.unassignMember(actor, staffId, assignmentId);
    revalidateStaffPaths(staffId);
    return actionSuccess({ ok: true as const });
  });
}
