"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";

function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { memberGymService } from "@/lib/services/member-gym.service";
import { memberGymUploadService } from "@/lib/services/member-gym-upload.service";
import {
  approveMemberGymApplicationSchema,
  createMemberGymJoinLinkSchema,
  memberGymJoinApplicationSchema,
  memberGymManualApplicationSchema,
  applicationAttachmentMetaSchema,
  setJoinLinkStatusSchema,
  transitionMemberGymApplicationSchema,
} from "@/lib/validators/member-gym.validator";
import { parseMemberGymSettings } from "@/lib/member-gym/settings";
import {
  AssociationJoinLinkAttachmentKind,
  AssociationMemberGymApplicationAttachmentType,
} from "@/lib/enums";

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
            : "FORBIDDEN",
      e.message,
      e.details,
    );
  }
  console.error("[member-gym]", e);
  return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
}

function revalidateMemberGymPaths() {
  revalidatePath("/organizer/member-gyms");
  revalidatePath("/organizer/member-gyms/overview");
  revalidatePath("/organizer/member-gyms/links");
  revalidatePath("/organizer/member-gyms/applications");
  revalidatePath("/organizer/member-gyms/settings");
}

export async function createMemberGymJoinLinkAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string; url: string }>> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = createMemberGymJoinLinkSchema.safeParse(
      formDataToObject(formData),
    );
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const result = await memberGymService.createLink(actor, parsed.data);
    revalidateMemberGymPaths();
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export type MemberGymJoinLinkCopyPrepareResult =
  | { kind: "none" }
  | {
      kind: "single";
      link: {
        id: string;
        label: string;
        url: string;
        expiresAt: Date | null;
        usedCount: number;
        maxUses: number | null;
      };
    }
  | {
      kind: "many";
      links: {
        id: string;
        label: string;
        url: string;
        expiresAt: Date | null;
        usedCount: number;
        maxUses: number | null;
      }[];
    };

export async function prepareMemberGymJoinLinkCopyAction(): Promise<
  ActionResult<MemberGymJoinLinkCopyPrepareResult>
> {
  try {
    const actor = await requireActorFromMutation();
    const links = await memberGymService.listActiveLinksForCopy(actor);
    if (links.length === 0) return actionSuccess({ kind: "none" });
    if (links.length === 1) {
      return actionSuccess({ kind: "single", link: links[0]! });
    }
    return actionSuccess({ kind: "many", links });
  } catch (e) {
    return mapError(e);
  }
}

export async function ensureDefaultMemberGymJoinLinkAction(): Promise<
  ActionResult<{ id: string; url: string; label: string }>
> {
  try {
    const actor = await requireActorFromMutation();
    const link = await memberGymService.ensureDefaultActiveLink(actor);
    revalidateMemberGymPaths();
    return actionSuccess({
      id: link.id,
      url: link.url,
      label: link.label,
    });
  } catch (e) {
    return mapError(e);
  }
}

export async function createManualMemberGymApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = memberGymManualApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    let attachments: ReturnType<
      typeof applicationAttachmentMetaSchema.parse
    > = [];
    if (parsed.data.attachmentsJson) {
      try {
        attachments = applicationAttachmentMetaSchema.parse(
          JSON.parse(parsed.data.attachmentsJson),
        );
      } catch {
        return actionFailure(
          "VALIDATION_ERROR",
          "첨부파일 정보가 올바르지 않습니다.",
        );
      }
    }
    const result = await memberGymService.createManualApplication(actor, {
      ...parsed.data,
      paperConsentConfirmed: true,
      attachments,
    });
    revalidateMemberGymPaths();
    revalidatePath(
      `/organizer/member-gyms/applications/${result.applicationId}`,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function issueManualMemberGymApplicationUploadAction(input: {
  uploadBatchId: string;
  attachmentType: AssociationMemberGymApplicationAttachmentType;
  mimeType: string;
  sizeBytes: number;
  originalFileName: string;
}): Promise<
  ActionResult<{ uploadUrl: string; path: string; bucket: string; expiresIn: number }>
> {
  try {
    const actor = await requireActorFromMutation();
    const result = await memberGymUploadService.issueManualApplicationUploadUrl(
      actor,
      input,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function setMemberGymJoinLinkStatusAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = setJoinLinkStatusSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "상태 값이 올바르지 않습니다.");
    }
    await memberGymService.setLinkStatus(
      actor,
      parsed.data.linkId,
      parsed.data.status,
    );
    revalidateMemberGymPaths();
    return actionSuccess({ ok: true });
  } catch (e) {
    return mapError(e);
  }
}

export async function submitMemberGymJoinApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; message: string }>> {
  try {
    const parsed = memberGymJoinApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    let attachments: ReturnType<
      typeof applicationAttachmentMetaSchema.parse
    > = [];
    if (parsed.data.attachmentsJson) {
      try {
        attachments = applicationAttachmentMetaSchema.parse(
          JSON.parse(parsed.data.attachmentsJson),
        );
      } catch {
        return actionFailure("VALIDATION_ERROR", "첨부파일 정보가 올바르지 않습니다.");
      }
    }
    const result = await memberGymService.submitApplication(parsed.data.token, {
      ...parsed.data,
      privacyConsent: true,
      registrationConsent: true,
      signatureConsent: true,
      attachments,
    });
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function transitionMemberGymApplicationAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = transitionMemberGymApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "상태 전환 값이 올바르지 않습니다.");
    }
    await memberGymService.transitionApplication(actor, parsed.data);
    revalidateMemberGymPaths();
    revalidatePath(
      `/organizer/member-gyms/applications/${parsed.data.applicationId}`,
    );
    return actionSuccess({ ok: true });
  } catch (e) {
    return mapError(e);
  }
}

export async function approveMemberGymApplicationAction(
  input: unknown,
): Promise<
  ActionResult<{
    memberGymId: string;
    gymId: string;
    gymCreated: boolean;
    memberCode: string;
  }>
> {
  try {
    const actor = await requireActorFromMutation();
    const parsed = approveMemberGymApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "승인 요청이 올바르지 않습니다.");
    }
    const result = await memberGymService.approveApplication(actor, parsed.data);
    revalidateMemberGymPaths();
    revalidatePath(
      `/organizer/member-gyms/applications/${parsed.data.applicationId}`,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function saveMemberGymSettingsAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    const settings = parseMemberGymSettings(input);
    await memberGymService.saveSettings(actor, settings);
    revalidatePath("/organizer/member-gyms/settings");
    return actionSuccess({ ok: true });
  } catch (e) {
    return mapError(e);
  }
}

export async function issueMemberGymLinkAttachmentUploadAction(input: {
  linkId: string;
  mimeType: string;
  sizeBytes: number;
  kind?: AssociationJoinLinkAttachmentKind;
}): Promise<
  ActionResult<{ uploadUrl: string; path: string; bucket: string; expiresIn: number }>
> {
  try {
    const actor = await requireActorFromMutation();
    const result = await memberGymUploadService.issueLinkAttachmentUploadUrl(
      actor,
      input,
    );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}

export async function registerMemberGymLinkAttachmentAction(input: {
  linkId: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  kind?: AssociationJoinLinkAttachmentKind;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireActorFromMutation();
    const row = await memberGymUploadService.registerLinkAttachment(actor, input);
    revalidatePath("/organizer/member-gyms/links");
    return actionSuccess({ id: row.id });
  } catch (e) {
    return mapError(e);
  }
}

export async function getMemberGymApplicationAttachmentDownloadAction(
  attachmentId: string,
): Promise<ActionResult<{ signedUrl: string; expiresIn: number }>> {
  try {
    const actor = await requireActorFromMutation();
    const result =
      await memberGymUploadService.getApplicationAttachmentDownloadUrl(
        actor,
        attachmentId,
      );
    return actionSuccess(result);
  } catch (e) {
    return mapError(e);
  }
}
