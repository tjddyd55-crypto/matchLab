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
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import { memberSportTemplateAdminService } from "@/lib/services/member-sport-template-admin.service";

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

const REVALIDATE = "/admin/member-sport-templates";

export async function createMemberSportTemplateAction(input: {
  code: string;
  name: string;
  sportType: string;
}): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const created = await memberSportTemplateAdminService.createTemplate(
      actor,
      input,
    );
    revalidatePath(REVALIDATE);
    return actionSuccess({ id: created.id });
  });
}

export async function updateMemberSportTemplateMetaAction(
  templateId: string,
  input: { name?: string; sportType?: string; active?: boolean },
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await memberSportTemplateAdminService.updateTemplateMeta(
      actor,
      templateId,
      input,
    );
    revalidatePath(REVALIDATE);
    revalidatePath(`${REVALIDATE}/${templateId}`);
    return actionSuccess({ ok: true });
  });
}

export async function saveMemberSportTemplateFieldsAction(
  templateId: string,
  fields: GymMemberDynamicFieldDefinition[],
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await memberSportTemplateAdminService.saveFields(
      actor,
      templateId,
      fields,
    );
    revalidatePath(REVALIDATE);
    revalidatePath(`${REVALIDATE}/${templateId}`);
    return actionSuccess({ ok: true });
  });
}

export async function deleteMemberSportTemplateFieldAction(
  fieldId: string,
  templateId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await memberSportTemplateAdminService.deleteField(actor, fieldId);
    revalidatePath(REVALIDATE);
    revalidatePath(`${REVALIDATE}/${templateId}`);
    return actionSuccess({ ok: true });
  });
}

export async function duplicateMemberSportTemplateAction(
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const created = await memberSportTemplateAdminService.duplicateTemplate(
      actor,
      templateId,
    );
    revalidatePath(REVALIDATE);
    return actionSuccess({ id: created.id });
  });
}

export async function deleteMemberSportTemplateAction(
  templateId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await memberSportTemplateAdminService.deleteTemplate(actor, templateId);
    revalidatePath(REVALIDATE);
    return actionSuccess({ ok: true });
  });
}
