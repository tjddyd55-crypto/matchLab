"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { headers } from "next/headers";
import { matchonPhoneVerificationService } from "@/server/phone-verification/services/matchon-phone-verification.service";

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error("[phone-verification]", e instanceof Error ? e.message : "error");
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return h.get("x-real-ip");
}

export async function requestSignupPhoneCodeAction(input: {
  phone: string;
  accountType: "association" | "gym";
}): Promise<
  ActionResult<{
    requestId: string;
    expiresAt: string;
    resendAvailableAt: string;
    deliveryMode: "mock" | "dry_run" | "live";
  }>
> {
  return mapCaught(async () => {
    const data = await matchonPhoneVerificationService.requestSignupCode({
      phone: input.phone,
      accountType: input.accountType,
      requestIp: await clientIp(),
    });
    return actionSuccess(data);
  });
}

export async function verifySignupPhoneCodeAction(input: {
  requestId: string;
  phone: string;
  code: string;
}): Promise<
  ActionResult<{ signupVerificationToken: string; expiresAt: string }>
> {
  return mapCaught(async () => {
    const data = await matchonPhoneVerificationService.verifySignupCode(input);
    return actionSuccess(data);
  });
}

export async function requestPasswordResetPhoneCodeAction(input: {
  loginId: string;
  phone: string;
}): Promise<
  ActionResult<{
    requestId: string;
    expiresAt: string;
    resendAvailableAt: string;
    deliveryMode: "mock" | "dry_run" | "live";
  }>
> {
  return mapCaught(async () => {
    const data = await matchonPhoneVerificationService.requestPasswordResetCode({
      loginId: input.loginId,
      phone: input.phone,
      requestIp: await clientIp(),
    });
    return actionSuccess(data);
  });
}

export async function verifyPasswordResetPhoneCodeAction(input: {
  requestId: string;
  loginId: string;
  phone: string;
  code: string;
}): Promise<ActionResult<{ passwordResetToken: string; expiresAt: string }>> {
  return mapCaught(async () => {
    const data =
      await matchonPhoneVerificationService.verifyPasswordResetCode(input);
    return actionSuccess(data);
  });
}

export async function resetPasswordWithVerifiedPhoneAction(input: {
  passwordResetToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const data =
      await matchonPhoneVerificationService.resetPasswordWithToken(input);
    return actionSuccess(data);
  });
}
