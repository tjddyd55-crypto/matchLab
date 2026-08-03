"use server";

import { cookies, headers } from "next/headers";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { adminPasswordResetLinkService } from "@/lib/services/admin-password-reset-link.service";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import { ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE } from "@/server/admin-password-reset/token";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(
      "[admin-password-reset]",
      e instanceof Error ? e.message : "error",
    );
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return h.get("x-real-ip");
}

async function clientUa(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

export async function resolveAdminPasswordResetTargetAction(input: {
  loginId: string;
}): Promise<ActionResult<Awaited<ReturnType<typeof adminPasswordResetLinkService.resolveTargetForAdmin>>>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await adminPasswordResetLinkService.resolveTargetForAdmin(
      actor,
      input.loginId,
    );
    return actionSuccess(data);
  });
}

export async function issueAdminPasswordResetLinkAction(input: {
  loginId: string;
  inquiryId?: string | null;
}): Promise<
  ActionResult<{
    resetUrl: string;
    expiresAt: string;
    linkId: string;
    loginId: string;
    accountLabel: string;
    accountType: string;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await adminPasswordResetLinkService.issueLink(actor, input);
    return actionSuccess(data);
  });
}

export async function revokeAdminPasswordResetLinkAction(input: {
  linkId: string;
}): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await adminPasswordResetLinkService.revokeActiveLink(
      actor,
      input,
    );
    return actionSuccess(data);
  });
}

export async function listAdminPasswordResetHistoryAction(input: {
  userId: string;
}): Promise<
  ActionResult<
    Awaited<ReturnType<typeof adminPasswordResetLinkService.listRecentForTarget>>
  >
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const data = await adminPasswordResetLinkService.listRecentForTarget(
      actor,
      input.userId,
    );
    return actionSuccess(data);
  });
}

/** URL token → HttpOnly challenge cookie. raw token은 응답에 포함하지 않는다. */
export async function exchangeAdminPasswordResetTokenAction(input: {
  token: string;
}): Promise<
  ActionResult<{
    status: string;
    loginIdMasked: string;
    accountTypeLabel: string;
  }>
> {
  return mapCaught(async () => {
    const config = loadMatchonAdminPasswordResetLinkConfig();
    if (!config.enabled) {
      throw new AppError("FORBIDDEN", "기능을 사용할 수 없습니다.");
    }
    const exchanged =
      await adminPasswordResetLinkService.exchangeTokenForChallenge({
        rawToken: input.token,
      });

    const jar = await cookies();
    if (exchanged.status === "valid" && exchanged.challengeToken) {
      jar.set(ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE, exchanged.challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/password-reset/admin-link",
        maxAge: Math.floor(config.challengeTtlMs / 1000),
      });
    } else {
      jar.delete(ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE);
    }

    return actionSuccess({
      status: exchanged.status,
      loginIdMasked: exchanged.loginIdMasked,
      accountTypeLabel: exchanged.accountTypeLabel,
    });
  });
}

export async function completeAdminPasswordResetAction(input: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const jar = await cookies();
    const challenge = jar.get(ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      throw new AppError("FORBIDDEN", "재설정 세션이 없습니다.");
    }
    const data = await adminPasswordResetLinkService.completeWithChallenge({
      challengeToken: challenge,
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
      requestIp: await clientIp(),
      userAgent: await clientUa(),
    });
    jar.delete(ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE);
    return actionSuccess(data);
  });
}
