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
import { gymMembershipSaleService } from "@/lib/services/gym-membership-sale.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { gymMemberLockerService } from "@/lib/services/gym-member-locker.service";
import { gymMemberExcelService } from "@/lib/services/gym-member-excel.service";
import {
  gymMemberImportService,
  type ImportPreviewResult,
} from "@/lib/services/gym-member-import.service";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import {
  gymMemberCreateSchema,
  gymMemberUpdateSchema,
  gymMembershipPlanSchema,
  gymMemberPromoteFighterSchema,
  gymMemberPaymentCreateSchema,
  gymMemberPauseSchema,
  gymMemberSubscriptionAssignSchema,
  gymMemberSubscriptionExtendSchema,
  gymMemberSubscriptionCorrectSchema,
  gymMembershipSaleSchema,
  gymMemberLinkFighterSchema,
} from "@/lib/validators/gym-member.validator";
import { gymReceivableCollectSchema, gymRefundCreateSchema } from "@/lib/validators/gym-sales.validator";

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
    const groupIds = formData
      .getAll("groupIds")
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    const parsed = gymMemberCreateSchema.safeParse({
      ...formObj(formData, [
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
        "profileImagePath",
        "smsOptOut",
        "confirmDuplicate",
        "planId",
        "subscriptionStartedAt",
        "subscriptionEndsAt",
        "paymentAmount",
        "paymentMethod",
        "paymentMemo",
        "lockerEnabled",
        "lockerLabel",
        "lockerStartedAt",
        "lockerEndsAt",
        "lockerAmount",
        "lockerMemo",
        "registerAsFighter",
        "height",
        "weight",
        "fighterPrimarySport",
        "createLoginAccount",
        "loginId",
        "password",
      ]),
      groupIds,
    });
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
    const groupIds = formData
      .getAll("groupIds")
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    const parsed = gymMemberUpdateSchema.safeParse({
      ...formObj(formData, [
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
        "profileImagePath",
        "removeProfileImage",
        "smsOptOut",
      ]),
      groupIds,
    });
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

export async function sellGymMembershipAction(
  memberId: string,
  formData: FormData,
): Promise<
  ActionResult<{
    subscriptionId: string;
    paymentId: string | null;
    receivableId: string | null;
    outstanding: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMembershipSaleSchema.safeParse(
      formObj(formData, [
        "planId",
        "startedAt",
        "endsAt",
        "listPrice",
        "discountAmount",
        "discountReason",
        "paidAmount",
        "paidAt",
        "paymentMethod",
        "memo",
        "op",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymMembershipSaleService.sellMembership(
      actor,
      memberId,
      parsed.data,
    );
    revalidateMemberPaths(memberId);
    revalidatePath("/gym/sales");
    revalidatePath("/gym/sales/receivables");
    return actionSuccess(result);
  });
}

export async function correctGymMemberSubscriptionAction(
  memberId: string,
  subscriptionId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymMemberSubscriptionCorrectSchema.safeParse(
      formObj(formData, ["startedAt", "endsAt", "memo"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    await gymMembershipSaleService.correctSubscription(
      actor,
      memberId,
      subscriptionId,
      parsed.data,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function cancelGymMemberSubscriptionAction(
  memberId: string,
  subscriptionId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMembershipSaleService.cancelSubscription(
      actor,
      memberId,
      subscriptionId,
    );
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function collectGymMemberReceivableAction(
  memberId: string,
  receivableId: string,
  formData: FormData,
): Promise<ActionResult<{ paymentId: string; remaining: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymReceivableCollectSchema.safeParse(
      formObj(formData, ["amount", "paidAt", "paymentMethod", "memo"]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await gymSalesService.collectReceivablePayment(
      actor,
      receivableId,
      parsed.data,
    );
    revalidateMemberPaths(memberId);
    revalidatePath("/gym/sales");
    revalidatePath("/gym/sales/receivables");
    return actionSuccess({
      paymentId: result.payment.id,
      remaining: result.remaining,
    });
  });
}

export async function refundGymMemberPaymentAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ refundId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymRefundCreateSchema.safeParse(
      formObj(formData, [
        "paymentId",
        "manualSaleId",
        "amount",
        "refundedAt",
        "refundMethod",
        "reason",
        "memo",
      ]),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    if (!parsed.data.paymentId) {
      return actionFailure("VALIDATION_ERROR", "환불 대상 결제를 지정해 주세요.");
    }
    const created = await gymSalesService.createRefund(actor, parsed.data);
    revalidateMemberPaths(memberId);
    revalidatePath("/gym/sales");
    return actionSuccess({ refundId: created.id });
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
        "listPrice",
        "discountAmount",
        "paidAt",
        "paymentMethod",
        "subscriptionId",
        "category",
        "memo",
      ]),
      paymentMethod:
        formStr(formData, "paymentMethod") || GymMemberPaymentMethod.card,
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
      {
        ...parsed.data,
        category: parsed.data.category ?? null,
      },
    );
    revalidateMemberPaths(memberId);
    revalidatePath("/gym/sales");
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

export async function reorderGymMembershipPlansAction(
  orderedIds: string[],
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMembershipPlanService.reorderPlans(actor, orderedIds);
    revalidatePath("/gym/membership-plans");
    return actionSuccess({ ok: true });
  });
}

export async function createGymMemberGroupAction(
  formData: FormData,
): Promise<ActionResult<{ groupId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const name = formStr(formData, "name");
    const sortOrderRaw = formStr(formData, "sortOrder");
    const isActiveRaw = formData.get("isActive");
    const isActive =
      isActiveRaw === null || isActiveRaw === ""
        ? true
        : isActiveRaw === "true";
    const group = await gymMemberGroupService.createGroup(actor, {
      name,
      sortOrder: sortOrderRaw ? Number(sortOrderRaw) : undefined,
      isActive,
    });
    revalidatePath("/gym/member-groups");
    revalidatePath("/gym/members");
    return actionSuccess({ groupId: group.id });
  });
}

export async function updateGymMemberGroupAction(
  groupId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberGroupService.updateGroup(actor, groupId, {
      name: formStr(formData, "name"),
      sortOrder: formStr(formData, "sortOrder")
        ? Number(formStr(formData, "sortOrder"))
        : undefined,
      isActive: formData.get("isActive") === "true",
    });
    revalidatePath("/gym/member-groups");
    revalidatePath("/gym/members");
    return actionSuccess({ ok: true });
  });
}

export async function reorderGymMemberGroupsAction(
  orderedIds: string[],
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberGroupService.reorderGroups(actor, orderedIds);
    revalidatePath("/gym/member-groups");
    return actionSuccess({ ok: true });
  });
}

export async function deleteGymMemberGroupAction(
  groupId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberGroupService.softDeleteGroup(actor, groupId);
    revalidatePath("/gym/member-groups");
    revalidatePath("/gym/members");
    return actionSuccess({ ok: true });
  });
}

export async function createGymMemberLockerRentalAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResult<{ rentalId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const amount = Number(formStr(formData, "amount") || "0");
    const rental = await gymMemberLockerService.createRental(actor, memberId, {
      lockerLabel: formStr(formData, "lockerLabel"),
      startedAt: new Date(formStr(formData, "startedAt") || Date.now()),
      endsAt: formStr(formData, "endsAt")
        ? new Date(formStr(formData, "endsAt"))
        : null,
      amount: Number.isFinite(amount) ? amount : 0,
      memo: formStr(formData, "memo") || null,
      createPayment: formStr(formData, "createPayment") === "true",
      paymentMethod:
        (formStr(formData, "paymentMethod") as GymMemberPaymentMethod) ||
        GymMemberPaymentMethod.card,
    });
    revalidateMemberPaths(memberId);
    return actionSuccess({ rentalId: rental.id });
  });
}

export async function extendGymMemberLockerRentalAction(
  memberId: string,
  rentalId: string,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const additionalAmount = Number(
      formStr(formData, "additionalAmount") || "0",
    );
    await gymMemberLockerService.extendRental(actor, rentalId, {
      newEndsAt: new Date(formStr(formData, "newEndsAt")),
      additionalAmount: Number.isFinite(additionalAmount)
        ? additionalAmount
        : 0,
      paymentMethod:
        (formStr(formData, "paymentMethod") as GymMemberPaymentMethod) ||
        undefined,
      memo: formStr(formData, "memo") || null,
    });
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function endGymMemberLockerRentalAction(
  memberId: string,
  rentalId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymMemberLockerService.endRental(actor, rentalId);
    revalidateMemberPaths(memberId);
    return actionSuccess({ ok: true });
  });
}

export async function analyzeGymMemberExcelImportAction(
  formData: FormData,
): Promise<ActionResult<ImportPreviewResult>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return actionFailure("VALIDATION_ERROR", "Excel 파일을 선택해 주세요.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await gymMemberImportService.analyzeWorkbook(actor, {
      fileName: file.name,
      buffer,
    });
    return actionSuccess(preview);
  });
}

export async function commitGymMemberExcelImportAction(
  formData: FormData,
): Promise<
  ActionResult<{
    batchId: string;
    success: number;
    failed: number;
    skipped: number;
    total: number;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const batchId = formStr(formData, "batchId");
    if (!batchId) {
      return actionFailure("VALIDATION_ERROR", "Import 배치 ID가 필요합니다.");
    }

    const file = formData.get("file");
    let buffer: Buffer;
    if (file instanceof File && file.size > 0) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const base64 = formStr(formData, "fileBase64");
      if (!base64) {
        return actionFailure("VALIDATION_ERROR", "Excel 파일을 다시 첨부해 주세요.");
      }
      buffer = Buffer.from(base64, "base64");
    }

    let planBindings: Record<string, string> = {};
    let memberBindings: Record<string, string> = {};
    let skipRows: number[] = [];
    try {
      planBindings = JSON.parse(formStr(formData, "planBindings") || "{}") as Record<
        string,
        string
      >;
      memberBindings = JSON.parse(
        formStr(formData, "memberBindings") || "{}",
      ) as Record<string, string>;
      skipRows = JSON.parse(formStr(formData, "skipRows") || "[]") as number[];
    } catch {
      return actionFailure(
        "VALIDATION_ERROR",
        "매핑 데이터 형식이 올바르지 않습니다.",
      );
    }

    const createMissingGroups = formStr(formData, "createMissingGroups") !== "false";
    const fileName = formStr(formData, "fileName") || "import.xlsx";

    const result = await gymMemberImportService.commitImport(actor, {
      batchId,
      fileName,
      buffer,
      planBindings,
      memberBindings,
      skipRows,
      createMissingGroups,
    });

    revalidatePath("/gym/members");
    return actionSuccess(result);
  });
}

export async function exportGymMembersExcelAction(input: {
  fieldKeys: string[];
  scope: "all" | "filtered";
  filters?: {
    q?: string;
    status?: string;
    fighter?: string;
    expiration?: string;
    joined?: string;
    groupId?: string;
  };
}): Promise<ActionResult<{ base64: string; filename: string; rowCount: number }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const status =
      input.filters?.status === GymMemberStatus.active ||
      input.filters?.status === GymMemberStatus.paused ||
      input.filters?.status === GymMemberStatus.withdrawn
        ? input.filters.status
        : undefined;
    const fighterFilter =
      input.filters?.fighter === "fighter" || input.filters?.fighter === "non_fighter"
        ? input.filters.fighter
        : "all";
    const joinedFilter =
      input.filters?.joined === "this-month" ? "this-month" : "all";
    const expirationFilter =
      input.filters?.expiration === "active" ||
      input.filters?.expiration === "expiring" ||
      input.filters?.expiration === "expired" ||
      input.filters?.expiration === "no_plan"
        ? input.filters.expiration
        : "all";
    const { buffer, filename, rowCount } = await gymMemberExcelService.buildWorkbook(
      actor,
      {
        fieldKeys: input.fieldKeys,
        scope: input.scope,
        filters:
          input.scope === "filtered"
            ? {
                q: input.filters?.q,
                status,
                fighterFilter,
                expirationFilter,
                joinedFilter,
                groupId: input.filters?.groupId,
              }
            : undefined,
      },
    );
    return actionSuccess({
      base64: buffer.toString("base64"),
      filename,
      rowCount,
    });
  });
}
