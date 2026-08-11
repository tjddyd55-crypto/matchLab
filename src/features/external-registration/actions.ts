"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  externalRegistrationLinkService,
  type ExternalRegistrationLinkVM,
} from "@/lib/services/external-registration-link.service";
import { applicationService } from "@/lib/services/application.service";
import { externalRegistrationBatchSchema } from "@/lib/validators/external-registration.validator";
import {
  checkExternalRegistrationResolveRateLimit,
  checkExternalRegistrationSubmitRateLimit,
} from "@/lib/external-registration/rate-limit";

function clientIpFromHeaders(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function fromAppError(e: unknown): ActionResult<never> {
  if (e instanceof AppError) {
    return actionFailure(e.code, e.message, e.details);
  }
  throw e;
}

export async function ensureExternalRegistrationLinkAction(
  eventId: string,
): Promise<ActionResult<ExternalRegistrationLinkVM>> {
  try {
    const actor = await requireActor();
    const link = await externalRegistrationLinkService.getOrCreateLink(
      actor,
      eventId,
    );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(link);
  } catch (e) {
    return fromAppError(e);
  }
}

export async function revokeExternalRegistrationLinkAction(
  eventId: string,
): Promise<ActionResult<ExternalRegistrationLinkVM>> {
  try {
    const actor = await requireActor();
    const link = await externalRegistrationLinkService.revokeLink(actor, eventId);
    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(link);
  } catch (e) {
    return fromAppError(e);
  }
}

export async function regenerateExternalRegistrationLinkAction(
  eventId: string,
): Promise<ActionResult<ExternalRegistrationLinkVM>> {
  try {
    const actor = await requireActor();
    const link = await externalRegistrationLinkService.regenerateLink(
      actor,
      eventId,
    );
    revalidatePath(`/organizer/events/${eventId}/applications`);
    return actionSuccess(link);
  } catch (e) {
    return fromAppError(e);
  }
}

export async function submitExternalRegistrationBatchAction(
  raw: unknown,
): Promise<
  ActionResult<{
    submissionId: string;
    athleteCount: number;
    gymName: string;
    results: Array<{
      applicationId: string;
      fighterName: string;
      divisionId: string;
    }>;
    idempotentReplay: boolean;
  }>
> {
  try {
    const h = await headers();
    const ip = clientIpFromHeaders(h);
    const parsed = externalRegistrationBatchSchema.safeParse(raw);
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }

    const resolveLimit = checkExternalRegistrationResolveRateLimit(ip);
    if (!resolveLimit.ok) {
      return actionFailure(
        "FORBIDDEN",
        `요청이 너무 많습니다. ${resolveLimit.retryAfterSec}초 후 다시 시도해 주세요.`,
      );
    }

    const resolved = await externalRegistrationLinkService.resolvePublicToken(
      parsed.data.token,
    );
    if (!resolved.ok) {
      const msg =
        resolved.reason === "revoked"
          ? "사용이 중지된 등록 링크입니다."
          : resolved.reason === "expired"
            ? "만료된 등록 링크입니다."
            : "유효하지 않은 등록 링크입니다.";
      return actionFailure("FORBIDDEN", msg);
    }
    if (resolved.closedReason) {
      return actionFailure("FORBIDDEN", resolved.closedReason);
    }

    const submitLimit = checkExternalRegistrationSubmitRateLimit({
      ip,
      linkId: resolved.linkId,
    });
    if (!submitLimit.ok) {
      return actionFailure(
        "FORBIDDEN",
        `요청이 너무 많습니다. ${submitLimit.retryAfterSec}초 후 다시 시도해 주세요.`,
      );
    }

    const result = await applicationService.createExternalLinkBatchApplications(
      parsed.data,
    );
    return actionSuccess(result);
  } catch (e) {
    return fromAppError(e);
  }
}
