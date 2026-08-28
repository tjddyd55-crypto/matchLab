"use server";

import { revalidatePath } from "next/cache";
import { requireActorFromMutation } from "@/lib/auth/actor";
import {
  BillingProviderEnvironment,
  BillingProviderKind,
} from "@/generated/prisma";
import { adminBillingSettingsService } from "@/lib/services/admin-billing-settings.service";
import { AppError } from "@/lib/errors/app-error";

function errMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "요청을 처리하지 못했습니다.";
}

export async function saveBillingProviderCredentialsAction(input: {
  environment: "TEST" | "LIVE";
  clientKey?: string;
  secretKey?: string;
}) {
  try {
    const actor = await requireActorFromMutation();
    if (actor.role !== "admin") {
      return { ok: false as const, error: "관리자만 접근할 수 있습니다." };
    }
    const data = await adminBillingSettingsService.saveProviderCredentials(
      actor,
      input,
    );
    revalidatePath("/admin/billing/settings");
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function deleteBillingProviderSecretAction(input: {
  environment: "TEST" | "LIVE";
}) {
  try {
    const actor = await requireActorFromMutation();
    if (actor.role !== "admin") {
      return { ok: false as const, error: "관리자만 접근할 수 있습니다." };
    }
    await adminBillingSettingsService.deleteProviderSecret(
      actor,
      input.environment,
    );
    revalidatePath("/admin/billing/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function updateBillingRuntimeAction(input: {
  provider: "NONE" | "TOSS";
  environment: "TEST" | "LIVE" | null;
  enabled: boolean;
}) {
  try {
    const actor = await requireActorFromMutation();
    if (actor.role !== "admin") {
      return { ok: false as const, error: "관리자만 접근할 수 있습니다." };
    }
    const provider =
      input.provider === "TOSS"
        ? BillingProviderKind.TOSS
        : BillingProviderKind.NONE;
    const environment =
      input.environment === "TEST"
        ? BillingProviderEnvironment.TEST
        : input.environment === "LIVE"
          ? BillingProviderEnvironment.LIVE
          : null;

    await adminBillingSettingsService.updateRuntime(actor, {
      provider,
      environment,
      enabled: input.enabled,
    });
    revalidatePath("/admin/billing/settings");
    revalidatePath("/billing/checkout");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}

export async function validateBillingSettingsAction() {
  try {
    const actor = await requireActorFromMutation();
    if (actor.role !== "admin") {
      return { ok: false as const, error: "관리자만 접근할 수 있습니다." };
    }
    const data = await adminBillingSettingsService.validateSettings(actor);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMessage(e) };
  }
}
