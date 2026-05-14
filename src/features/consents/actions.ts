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
import { consentService } from "@/lib/services/consent.service";
import { completeGuardianConsentFormSchema } from "@/lib/validators/guardian-consent.validator";

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
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
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

export async function completeGuardianConsentAction(
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const raw = Object.fromEntries(formData.entries()) as Record<
      string,
      string
    >;

    const parsed = completeGuardianConsentFormSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" ");
      return actionFailure(
        "VALIDATION_ERROR",
        msg || "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const h = await headers();

    await consentService.completeGuardianConsentByToken({
      consentId: parsed.data.consentId.trim(),
      registrationSubmissionId: parsed.data.registrationSubmissionId.trim(),
      token: parsed.data.token.trim(),
      signatureImagePath: parsed.data.signatureImagePath.trim(),
      guardianName: parsed.data.guardianName,
      guardianPhone: parsed.data.guardianPhone,
      relationship: parsed.data.relationship,
      privacyAgreed: true,
      riskAgreed: true,
      emergencyAgreed: true,
      resultDisclosureAgreed: true,
      photoVideoAgreed: true,
      ipAddress: clientIpFromHeaders(h),
      userAgent: h.get("user-agent"),
    });

    return actionSuccess({ ok: true as const });
  });
}
