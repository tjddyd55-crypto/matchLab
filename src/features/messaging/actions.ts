"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireRole } from "@/lib/permissions";
import { UserRole, MatchonMessageChannel, MatchonMessageOwnerType, MatchonMessageSourceType } from "@/lib/enums";
import {
  loadMatchonMessagingConfig,
  MatchonMessagingError,
  matchonMessagingService,
  matchonMessageTemplateService,
} from "@/lib/matchon-messaging";
import { assertAdminMessagingUiEnabled } from "@/server/messaging/domain/matchon-message-policy";

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
    }
    if (e instanceof MatchonMessagingError) {
      return actionFailure("VALIDATION_ERROR", e.message, {
        code: e.code,
        technical: e.technicalDetail,
      });
    }
    const message = e instanceof Error ? e.message : "요청 처리에 실패했습니다.";
    return actionFailure("INTERNAL", message);
  });
}

function requireMessagingAdmin() {
  return requireActorFromMutation().then((actor) => {
    requireRole(actor, [UserRole.admin]);
    const config = loadMatchonMessagingConfig();
    assertAdminMessagingUiEnabled(config);
    return actor;
  });
}

export async function previewMatchonMessageTestAction(
  formData: FormData,
): Promise<ActionResult<unknown>> {
  return mapCaught(async () => {
    await requireMessagingAdmin();
    const channel = String(formData.get("channel") || "sms") as MatchonMessageChannel;
    const phone = String(formData.get("phone") || "");
    const subject = String(formData.get("subject") || "") || null;
    const body = String(formData.get("body") || "");
    const templateId = String(formData.get("templateId") || "") || null;
    let variables: Record<string, string> = {};
    const variablesRaw = String(formData.get("variablesJson") || "").trim();
    if (variablesRaw) {
      variables = JSON.parse(variablesRaw) as Record<string, string>;
    }

    const preview = await matchonMessagingService.previewDispatch({
      ownerType: MatchonMessageOwnerType.platform,
      sourceType: MatchonMessageSourceType.test,
      channel,
      templateId,
      subject,
      body,
      recipients: [{ phone, variables }],
      allowRealSend: false,
    });
    return actionSuccess(preview);
  });
}

export async function executeMatchonMessageTestAction(
  formData: FormData,
): Promise<ActionResult<{ dispatchId: string }>> {
  return mapCaught(async () => {
    const actor = await requireMessagingAdmin();
    const channel = String(formData.get("channel") || "sms") as MatchonMessageChannel;
    const phone = String(formData.get("phone") || "");
    const subject = String(formData.get("subject") || "") || null;
    const body = String(formData.get("body") || "");
    const templateId = String(formData.get("templateId") || "") || null;
    const idempotencyKey = String(formData.get("idempotencyKey") || "") || null;
    let variables: Record<string, string> = {};
    const variablesRaw = String(formData.get("variablesJson") || "").trim();
    if (variablesRaw) {
      variables = JSON.parse(variablesRaw) as Record<string, string>;
    }

    const created = await matchonMessagingService.createDispatch({
      ownerType: MatchonMessageOwnerType.platform,
      sourceType: MatchonMessageSourceType.test,
      channel,
      templateId,
      subject,
      body,
      title: "관리자 DRY_RUN 테스트",
      recipients: [{ phone, variables }],
      requestedByUserId: actor.userId,
      idempotencyKey,
      allowRealSend: false,
    });

    const executed = await matchonMessagingService.executeDispatch(created.id, {
      allowRealSend: false,
    });

    return actionSuccess({ dispatchId: executed?.id ?? created.id });
  });
}

export async function createMatchonDraftTemplateAction(
  formData: FormData,
): Promise<ActionResult<{ templateId: string }>> {
  return mapCaught(async () => {
    const actor = await requireMessagingAdmin();
    const channel = String(formData.get("channel") || "kakao_alimtalk") as MatchonMessageChannel;
    const name = String(formData.get("name") || "미승인 테스트 템플릿");
    const body = String(formData.get("body") || "");
    const subject = String(formData.get("subject") || "") || null;
    let variables = {};
    const variablesRaw = String(formData.get("variablesJson") || "").trim();
    if (variablesRaw) variables = JSON.parse(variablesRaw);

    const template = await matchonMessageTemplateService.createDraft({
      channel,
      name,
      body,
      subject,
      variables,
      createdByUserId: actor.userId,
    });
    return actionSuccess({ templateId: template.id });
  });
}
