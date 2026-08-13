"use server";

import { headers } from "next/headers";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { selfRegistrationSubmitSchema } from "@/lib/gym-member-self-registration/validation";

function clientIp(headerList: Headers): string {
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function readPng(formData: FormData, key: string): Promise<Uint8Array | null> {
  const value = formData.get(key);
  if (!value || typeof value === "string") return null;
  const buf = new Uint8Array(await value.arrayBuffer());
  if (!buf.byteLength) return null;
  return buf;
}

export async function submitGymMemberSelfRegistrationAction(
  formData: FormData,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const jsonRaw = String(formData.get("payload") ?? "");
    let payloadUnknown: unknown;
    try {
      payloadUnknown = JSON.parse(jsonRaw);
    } catch {
      return actionFailure("VALIDATION_ERROR", "신청 내용이 올바르지 않습니다.");
    }
    const parsed = selfRegistrationSubmitSchema.safeParse(payloadUnknown);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return actionFailure(
        "VALIDATION_ERROR",
        first?.message ?? "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const memberSignature = await readPng(formData, "memberSignature");
    if (!memberSignature) {
      return actionFailure("VALIDATION_ERROR", "회원 서명이 필요합니다.");
    }
    const guardianSignature = await readPng(formData, "guardianSignature");

    const headerList = await headers();
    const result = await gymMemberSelfRegistrationService.submitPublic({
      payload: parsed.data,
      memberSignature,
      guardianSignature,
      ip: clientIp(headerList),
    });
    return actionSuccess({ requestId: result.requestId });
  } catch (e) {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(e);
    return actionFailure("INTERNAL", "신청 중 오류가 발생했습니다.");
  }
}
