"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { gymOwnerAccountService } from "@/lib/services/gym-owner-account.service";

function mapError(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) {
    return actionFailure("FORBIDDEN", e.message || "권한이 없습니다.");
  }
  if (e instanceof AppError) {
    return actionFailure(
      e.code === "VALIDATION_ERROR"
        ? "VALIDATION_ERROR"
        : e.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : e.code === "CONFLICT"
            ? "CONFLICT"
            : e.code === "INTERNAL"
              ? "INTERNAL"
              : "FORBIDDEN",
      e.message,
      e.details,
    );
  }
  console.error("[gym-owner-account]", e);
  return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
}

function revalidateMemberGym(memberGymId: string) {
  revalidatePath("/organizer/member-gyms");
  revalidatePath(`/organizer/member-gyms/${memberGymId}`);
}

export async function searchMemberGymOwnerUsersAction(input: {
  memberGymId: string;
  email?: string;
  phone?: string;
  name?: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    const rows = await gymOwnerAccountService.searchUsersForOwnerConnect(
      actor,
      input.memberGymId,
      input,
    );
    return actionSuccess(rows);
  } catch (e) {
    return mapError(e);
  }
}

export async function connectMemberGymOwnerAction(input: {
  memberGymId: string;
  targetUserId: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymOwnerAccountService.connectExistingOwner(actor, input);
    revalidateMemberGym(input.memberGymId);
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function inviteMemberGymOwnerAction(input: {
  memberGymId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    const result = await gymOwnerAccountService.createOwnerInvite(actor, input);
    revalidateMemberGym(input.memberGymId);
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function cancelMemberGymOwnerInviteAction(memberGymId: string) {
  try {
    const actor = await requireActorFromMutation();
    await gymOwnerAccountService.cancelOwnerInvite(actor, memberGymId);
    revalidateMemberGym(memberGymId);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function setMemberGymOwnerAccessSuspendedAction(input: {
  memberGymId: string;
  suspended: boolean;
}) {
  try {
    const actor = await requireActorFromMutation();
    await gymOwnerAccountService.setOwnerAccessSuspended(
      actor,
      input.memberGymId,
      input.suspended,
    );
    revalidateMemberGym(input.memberGymId);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function disconnectMemberGymOwnerAction(memberGymId: string) {
  try {
    const actor = await requireActorFromMutation();
    await gymOwnerAccountService.disconnectOwnerToPlaceholder(
      actor,
      memberGymId,
    );
    revalidateMemberGym(memberGymId);
    return actionSuccess({ ok: true as const });
  } catch (e) {
    return mapError(e);
  }
}

export async function acceptMemberGymOwnerInviteAction(input: {
  token: string;
  loginId: string;
  password: string;
}) {
  try {
    const result = await gymOwnerAccountService.acceptOwnerInvite(input.token, {
      loginId: input.loginId,
      password: input.password,
    });
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}
