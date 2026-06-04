"use server";

import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireRole } from "@/lib/permissions";
import { fighterService } from "@/lib/services/fighter.service";
import { inviteLinkService } from "@/lib/services/invite-link.service";
import {
  registrationService,
  type FighterRegistrationSubmitResult,
} from "@/lib/services/registration.service";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import { fighterRegistrationWithAccountSchema } from "@/lib/validators/fighter-registration.validator";

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
    if (isPrismaUniqueViolation(e)) {
      return actionFailure(
        "CONFLICT",
        "이미 등록된 정보와 충돌합니다. 중복 여부를 확인한 뒤 다시 시도해 주세요.",
      );
    }
    if (e instanceof Error && e.message.trim()) {
      console.error("[registration action]", e.name, e.message);
    } else {
      console.error("[registration action]", e);
    }
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function payloadFromFighterRegistrationForm(
  formData: FormData,
): Record<string, unknown> {
  const gv = (k: string): string | undefined => {
    const v = formData.get(k);
    if (v === null || typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? undefined : t;
  };
  const req = (k: string): string => {
    const v = formData.get(k);
    if (typeof v !== "string") return "";
    return v.trim();
  };
  return {
    name: req("name"),
    birthDate: req("birthDate"),
    gender: req("gender"),
    phone: req("phone"),
    height: formData.get("height"),
    weight: formData.get("weight"),
    profileImageUrl: gv("profileImageUrl") ?? "",
    schoolName: gv("schoolName"),
    grade: gv("grade"),
    guardianName: gv("guardianName"),
    guardianPhone: gv("guardianPhone"),
  };
}

const submissionIdSchema = z.object({
  submissionId: z.string().min(1),
});

const inviteCreateSchema = z.object({
  expiresAt: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return undefined;
    return v;
  }, z.coerce.date().optional()),
  maxUses: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().int().positive().optional()),
});

export async function submitFighterRegistrationFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<FighterRegistrationSubmitResult>> {
  return mapCaught(async () => {
    const tokenRaw = formData.get("token");
    if (typeof tokenRaw !== "string" || !tokenRaw.trim()) {
      return actionFailure("VALIDATION_ERROR", "초대 토큰이 없습니다.");
    }
    const token = tokenRaw.trim();

    const parsed = fighterRegistrationWithAccountSchema.safeParse({
      ...payloadFromFighterRegistrationForm(formData),
      loginId: formReq(formData, "loginId"),
      password: formReq(formData, "password"),
      passwordConfirm: formReq(formData, "passwordConfirm"),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" ");
      return actionFailure(
        "VALIDATION_ERROR",
        msg || "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const result = await registrationService.submitFighterRegistrationByToken(
      token,
      parsed.data,
    );
    return actionSuccess(result);
  });
}

export async function approveRegistrationSubmissionAction(
  formData: FormData,
): Promise<ActionResult<{ fighterId: string; fighterCode: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    requireRole(actor, ["gym", "admin"]);

    const submissionIdRaw = formData.get("submissionId");
    if (typeof submissionIdRaw !== "string") {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 ID가 올바르지 않습니다.",
      );
    }
    const parsed = submissionIdSchema.safeParse({
      submissionId: submissionIdRaw,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 ID가 올바르지 않습니다.",
      );
    }

    const result = await fighterService.approveRegistrationSubmission(
      actor,
      parsed.data.submissionId,
    );
    return actionSuccess(result);
  });
}

export async function rejectRegistrationSubmissionAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    requireRole(actor, ["gym", "admin"]);

    const submissionIdRaw = formData.get("submissionId");
    if (typeof submissionIdRaw !== "string") {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 ID가 올바르지 않습니다.",
      );
    }
    const parsed = submissionIdSchema.safeParse({
      submissionId: submissionIdRaw,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "요청 ID가 올바르지 않습니다.",
      );
    }

    await fighterService.rejectRegistrationSubmission(
      actor,
      parsed.data.submissionId,
    );
    return actionSuccess({ ok: true as const });
  });
}

export async function createFighterInviteLinkAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    requireRole(actor, ["gym", "admin"]);

    const parsed = inviteCreateSchema.safeParse({
      expiresAt: formData.get("expiresAt"),
      maxUses: formData.get("maxUses"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "만료일·사용 횟수 입력을 확인해 주세요.",
      );
    }

    const expiresAt = parsed.data.expiresAt ?? null;
    const maxUses = parsed.data.maxUses ?? null;

    const { token } = await inviteLinkService.createFighterRegistrationInviteLink(
      actor,
      {
        expiresAt,
        maxUses,
      },
    );

    return actionSuccess({ token });
  });
}
