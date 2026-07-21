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
import {
  GymMemberPaymentMethod,
  GymMemberStatus,
  GymMembershipDurationType,
} from "@/lib/enums";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import { gymMemberSubscriptionService } from "@/lib/services/gym-member-subscription.service";
import { gymMemberPaymentService } from "@/lib/services/gym-member-payment.service";
import {
  gymMemberCreateSchema,
  gymMemberUpdateSchema,
  gymMembershipPlanSchema,
  gymMemberPromoteFighterSchema,
  gymMemberPaymentCreateSchema,
  gymMemberPauseSchema,
  gymMemberSubscriptionAssignSchema,
  gymMemberSubscriptionExtendSchema,
  gymMemberLinkFighterSchema,
} from "@/lib/validators/gym-member.validator";

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

function formObj(formData: FormData, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) {
    o[k] = formStr(formData, k);
  }
  return o;
}

function revalidateMemberPaths(memberId?: string) {
  revalidatePath("/gym");
  revalidatePath("/gym/members");
  revalidatePath("/gym/fighters");
  if (memberId) revalidatePath(`/gym/members/${memberId}`);
}

export async function createGymMemberAction(
  formData: FormData,
): Promise<
  ActionResult<{
    memberId: string;
    memberNumber: string;
    fighterId?: string;
    loginCredentials?: { loginId: string; temporaryPassword: string };
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberCreateSchema.safeParse(
      formObj(formData, [
        "name",
        "phone",
        "joinedAt",
        "birthDate",
        "gender",
        "email",
        "postalCode",
        "address",
        "addressDetail",
        "emergencyContactName",
        "emergencyContactPhone",
        "guardianName",
        "guardianPhone",
        "primarySport",
        "rankName",
        "memo",
        "smsOptOut",
        "confirmDuplicate",
        "planId",
        "subscriptionStartedAt",
        "subscriptionEndsAt",
        "paymentAmount",
        "paymentMethod",
        "paymentMemo",
        "registerAsFighter",
        "height",
        "weight",
        "fighterPrimarySport",
        "createLoginAccount",
        "loginId",
        "password",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymMemberService.createMember(actor, parsed.data);
    revalidateMemberPaths(result.memberId);
    return actionSuccess(result);
  });
}

export async function updateGymMemberAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberUpdateSchema.safeParse(
      formObj(formData, [
        "name",
        "phone",
        "joinedAt",
        "birthDate",
        "gender",
        "email",
        "postalCode",
        "address",
        "addressDetail",
        "emergencyContactName",
        "emergencyContactPhone",
        "guardianName",
        "guardianPhone",
        "primarySport",
        "rankName",
        "memo",
        "smsOptOut",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymMemberService.updateMember(actor, memberId, parsed.data);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function setGymMemberStatusAction(
  memberId: string,
  status: GymMemberStatus,
  reason?: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberService.setMemberStatus(actor, memberId, status, reason);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function softDeleteGymMemberAction(
  memberId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberService.softDeleteMember(actor, memberId);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function promoteGymMemberToFighterAction(
  memberId: string,
  formData: FormData,
): Promise<
  ActionResult<{
    fighterId: string;
    fighterCode: string;
    loginCredentials?: { loginId: string; temporaryPassword: string };
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberPromoteFighterSchema.safeParse(
      formObj(formData, [
        "height",
        "weight",
        "primarySport",
        "createLoginAccount",
        "loginId",
        "password",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymMemberService.promoteToFighter(
      actor,
      memberId,
      parsed.data,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess(result);
  });
}

export async function linkGymMemberFighterAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberLinkFighterSchema.safeParse(
      formObj(formData, ["fighterId"]),
    );
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "선수를 선택해 주세요.");
    }
    await gymMemberService.linkExistingFighter(
      actor,
      memberId,
      parsed.data.fighterId,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function createGymMembershipPlanAction(
  formData: FormData,
): Promise<ActionResult<{ planId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMembershipPlanSchema.safeParse({
      ...formObj(formData, [
        "name",
        "durationType",
        "durationValue",
        "price",
        "description",
        "sortOrder",
        "isActive",
      ]),
      durationType:
        formStr(formData, "durationType") || GymMembershipDurationType.months,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const plan = await gymMembershipPlanService.createPlan(actor, parsed.data);
    revalidatePath("/gym/membership-plans");
    return actionSuccess({ planId: plan.id });
  });
}

export async function updateGymMembershipPlanAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMembershipPlanSchema.safeParse({
      ...formObj(formData, [
        "name",
        "durationType",
        "durationValue",
        "price",
        "description",
        "sortOrder",
        "isActive",
      ]),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymMembershipPlanService.updatePlan(actor, planId, parsed.data);
    revalidatePath("/gym/membership-plans");
    return actionSuccess({ ok: true });
  });
}

export async function deleteGymMembershipPlanAction(
  planId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMembershipPlanService.softDeletePlan(actor, planId);
    revalidatePath("/gym/membership-plans");
    return actionSuccess({ ok: true });
  });
}

export async function assignGymMemberSubscriptionAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberSubscriptionAssignSchema.safeParse(
      formObj(formData, ["planId", "startedAt", "endsAt", "memo"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymMemberSubscriptionService.assignPlan(actor, memberId, parsed.data);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function extendGymMemberSubscriptionAction(
  memberId: string,
  subscriptionId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberSubscriptionExtendSchema.safeParse(
      formObj(formData, ["extendDays"]),
    );
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "연장 일수를 입력해 주세요.");
    }
    await gymMemberSubscriptionService.extend(
      actor,
      memberId,
      subscriptionId,
      parsed.data.extendDays,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function pauseGymMemberAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberPauseSchema.safeParse(
      formObj(formData, ["pausedAt", "resumeAt", "extendEndsAt", "reason"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymMemberSubscriptionService.pause(actor, memberId, parsed.data);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function resumeGymMemberAction(
  memberId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberSubscriptionService.resume(actor, memberId);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function createGymMemberPaymentAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ paymentId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberPaymentCreateSchema.safeParse({
      ...formObj(formData, [
        "amount",
        "paidAt",
        "paymentMethod",
        "subscriptionId",
        "memo",
      ]),
      paymentMethod:
        formStr(formData, "paymentMethod") || GymMemberPaymentMethod.cash,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const payment = await gymMemberPaymentService.createPayment(
      actor,
      memberId,
      parsed.data,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess({ paymentId: payment.id });
  });
}

export async function cancelGymMemberPaymentAction(
  memberId: string,
  paymentId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberPaymentService.cancelPayment(actor, memberId, paymentId);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}
