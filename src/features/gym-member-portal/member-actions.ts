"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateMemberPaths(token: string) {
  const base = `/member-portal/${token}`;
  revalidatePath(base);
  revalidatePath(`${base}/home`);
  revalidatePath(`${base}/classes`);
  revalidatePath(`${base}/schedule`);
  revalidatePath(`${base}/me`);
}

export async function verifyGymMemberPortalIdentityAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const token = formStr(formData, "token");
    const name = formStr(formData, "name");
    const phone = formStr(formData, "phone");
    if (!token) {
      return actionFailure("VALIDATION_ERROR", "링크가 올바르지 않습니다.");
    }
    const result = await gymMemberPortalService.verifyIdentityAndCreateSession({
      rawPortalToken: token,
      name,
      phone,
      ip: await clientIp(),
    });
    if (!result.ok) {
      return actionFailure("VALIDATION_ERROR", result.message);
    }
    revalidateMemberPaths(token);
    return actionSuccess({ ok: true });
  });
}

/**
 * form action + redirect — Set-Cookie(만료)가 응답에 확실히 실리도록 한다.
 * mapCaught로 감싸지 않는다 (redirect throw 보존).
 */
export async function logoutGymMemberPortalFormAction(
  formData: FormData,
): Promise<void> {
  const token = formStr(formData, "token");
  try {
    await gymMemberPortalService.destroySession(token || undefined);
  } catch (e) {
    console.error(e);
  }
  if (token) {
    revalidateMemberPaths(token);
    redirect(`/member-portal/${token}`);
  }
  redirect("/");
}

export async function logoutGymMemberPortalAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const token = formStr(formData, "token");
    await gymMemberPortalService.destroySession(token || undefined);
    if (token) revalidateMemberPaths(token);
    return actionSuccess({ ok: true });
  });
}

export async function joinGymMemberPortalClassAction(
  formData: FormData,
): Promise<ActionResult<{ message: string; kind: string }>> {
  return mapCaught(async () => {
    const token = formStr(formData, "token");
    const classId = formStr(formData, "classId");
    if (!token || !classId) {
      return actionFailure("VALIDATION_ERROR", "신청할 수 없습니다.");
    }
    const session = await gymMemberPortalService.requireSession(token);
    if (!session) {
      return actionFailure("UNAUTHORIZED", "회원 확인이 필요합니다.");
    }
    const result = await gymMemberPortalService.joinClass(
      session,
      classId,
      await clientIp(),
    );
    revalidateMemberPaths(token);
    return actionSuccess({ message: result.message, kind: result.kind });
  });
}

export async function cancelGymMemberPortalClassAction(
  formData: FormData,
): Promise<ActionResult<{ message: string; kind: string }>> {
  return mapCaught(async () => {
    const token = formStr(formData, "token");
    const classId = formStr(formData, "classId");
    if (!token || !classId) {
      return actionFailure("VALIDATION_ERROR", "취소할 수 없습니다.");
    }
    const session = await gymMemberPortalService.requireSession(token);
    if (!session) {
      return actionFailure("UNAUTHORIZED", "회원 확인이 필요합니다.");
    }
    const result = await gymMemberPortalService.cancelClass(
      session,
      classId,
      await clientIp(),
    );
    revalidateMemberPaths(token);
    return actionSuccess({ message: result.message, kind: result.kind });
  });
}
