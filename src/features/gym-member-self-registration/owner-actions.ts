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
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";

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

function revalidateSelfRegPaths(memberId?: string) {
  revalidatePath("/gym/members");
  revalidatePath("/gym/members/registrations");
  if (memberId) revalidatePath(`/gym/members/${memberId}`);
}

export async function getOrCreateSelfRegistrationLinkAction(): Promise<
  ActionResult<{
    id: string;
    status: string;
    url: string | null;
    rawToken: string | null;
    gymName: string;
    submissionCount: number;
    pendingCount: number;
    terms: { version: number; title: string; content: string };
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await gymMemberSelfRegistrationService.getOrCreateLink(actor);
    revalidateSelfRegPaths();
    return actionSuccess(data);
  });
}

export async function regenerateSelfRegistrationLinkAction(): Promise<
  ActionResult<{ url: string; rawToken: string; status: string }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await gymMemberSelfRegistrationService.regenerateLink(actor);
    revalidateSelfRegPaths();
    return actionSuccess(data);
  });
}

export async function revokeSelfRegistrationLinkAction(): Promise<
  ActionResult<{ ok: true }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberSelfRegistrationService.revokeLink(actor);
    revalidateSelfRegPaths();
    return actionSuccess({ ok: true as const });
  });
}

export async function updateSelfRegistrationTermsAction(
  formData: FormData,
): Promise<ActionResult<{ version: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const title = String(formData.get("title") ?? "");
    const content = String(formData.get("content") ?? "");
    const row = await gymMemberSelfRegistrationService.updateTerms(actor, {
      title,
      content,
    });
    revalidateSelfRegPaths();
    return actionSuccess({ version: row.version });
  });
}

export async function approveSelfRegistrationRequestAction(
  formData: FormData,
): Promise<ActionResult<{ memberId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const requestId = String(formData.get("requestId") ?? "").trim();
    const confirmDuplicate = String(formData.get("confirmDuplicate") ?? "") === "true";
    const result = await gymMemberSelfRegistrationService.approveRequest(actor, {
      requestId,
      confirmDuplicate,
    });
    revalidateSelfRegPaths(result.memberId);
    revalidatePath(`/gym/members/registrations/${requestId}`);
    return actionSuccess(result);
  });
}

export async function rejectSelfRegistrationRequestAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const requestId = String(formData.get("requestId") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    await gymMemberSelfRegistrationService.rejectRequest(actor, {
      requestId,
      reason,
    });
    revalidateSelfRegPaths();
    revalidatePath(`/gym/members/registrations/${requestId}`);
    return actionSuccess({ ok: true as const });
  });
}
