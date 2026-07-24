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
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";

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

function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateAttendancePaths(memberId?: string) {
  revalidatePath("/gym");
  revalidatePath("/gym/attendance");
  revalidatePath("/gym/attendance/kiosks");
  revalidatePath("/gym/members");
  if (memberId) revalidatePath(`/gym/members/${memberId}`);
}

export async function createGymAttendanceKioskAction(
  formData: FormData,
): Promise<ActionResult<{ kioskId: string; path: string; rawToken: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const name = formStr(formData, "name");
    const result = await gymAttendanceService.createKiosk(actor, { name });
    revalidateAttendancePaths();
    return actionSuccess({
      kioskId: result.kiosk.id,
      path: result.path,
      rawToken: result.rawToken,
    });
  });
}

export async function setGymAttendanceKioskActiveAction(
  formData: FormData,
): Promise<ActionResult<{ kioskId: string; isActive: boolean }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const kioskId = formStr(formData, "kioskId");
    const isActive = formStr(formData, "isActive") === "true";
    if (!kioskId) {
      return actionFailure("VALIDATION_ERROR", "키오스크를 선택해 주세요.");
    }
    const updated = await gymAttendanceService.setKioskActive(
      actor,
      kioskId,
      isActive,
    );
    revalidateAttendancePaths();
    return actionSuccess({ kioskId: updated.id, isActive: updated.isActive });
  });
}

export async function regenerateGymAttendanceKioskTokenAction(
  formData: FormData,
): Promise<ActionResult<{ kioskId: string; path: string; rawToken: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const kioskId = formStr(formData, "kioskId");
    if (!kioskId) {
      return actionFailure("VALIDATION_ERROR", "키오스크를 선택해 주세요.");
    }
    const result = await gymAttendanceService.regenerateKioskToken(
      actor,
      kioskId,
    );
    revalidateAttendancePaths();
    return actionSuccess({
      kioskId: result.kiosk.id,
      path: result.path,
      rawToken: result.rawToken,
    });
  });
}

export async function createManualGymAttendanceAction(
  formData: FormData,
): Promise<ActionResult<{ attendanceId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const gymMemberId = formStr(formData, "gymMemberId");
    const attendedAt = formStr(formData, "attendedAt");
    const note = formStr(formData, "note");
    if (!gymMemberId) {
      return actionFailure("VALIDATION_ERROR", "회원을 선택해 주세요.");
    }
    const row = await gymAttendanceService.createManualAttendance(actor, {
      gymMemberId,
      attendedAt: attendedAt || undefined,
      note: note || undefined,
    });
    revalidateAttendancePaths(gymMemberId);
    return actionSuccess({ attendanceId: row.id });
  });
}

export async function cancelGymAttendanceAction(
  formData: FormData,
): Promise<ActionResult<{ attendanceId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const attendanceId = formStr(formData, "attendanceId");
    const reason = formStr(formData, "reason");
    const memberId = formStr(formData, "memberId");
    if (!attendanceId) {
      return actionFailure("VALIDATION_ERROR", "출석 기록을 선택해 주세요.");
    }
    const result = await gymAttendanceService.cancelAttendance(
      actor,
      attendanceId,
      reason || undefined,
    );
    revalidateAttendancePaths(memberId || undefined);
    return actionSuccess({ attendanceId: result.attendance.id });
  });
}
