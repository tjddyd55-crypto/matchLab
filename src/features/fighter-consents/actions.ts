"use server";

import { headers } from "next/headers";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { fighterConsentService } from "@/lib/services/fighter-consent.service";
import { completeFighterConsentByTokenSchema } from "@/lib/validators/fighter-consent.validator";

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

function clientIpFromHeaders(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function agreementFlag(formData: FormData, key: string): boolean {
  return formData.get(key) === "true" || formData.get(key) === "on";
}

export async function completeFighterConsentAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const parsed = completeFighterConsentByTokenSchema.safeParse({
      token: formReq(formData, "token"),
      signatureImagePath: formReq(formData, "signatureImagePath"),
      privacyAgreed: agreementFlag(formData, "privacyAgreed"),
      riskAgreed: agreementFlag(formData, "riskAgreed"),
      emergencyAgreed: agreementFlag(formData, "emergencyAgreed"),
      resultDisclosureAgreed: agreementFlag(formData, "resultDisclosureAgreed"),
      photoVideoAgreed: agreementFlag(formData, "photoVideoAgreed"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const h = await headers();
    await fighterConsentService.completeByToken(parsed.data, {
      ipAddress: clientIpFromHeaders(h),
      userAgent: h.get("user-agent"),
    });
    return actionSuccess({ ok: true as const });
  });
}
