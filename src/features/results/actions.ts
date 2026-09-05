"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { resolveFieldOpsCallerFromMutation } from "@/lib/onsite-ops/resolve-caller";
import type { ConfirmMatchResultsPrincipal } from "@/lib/services/result.service";
import { AppError } from "@/lib/errors/app-error";
import { resultService } from "@/lib/services/result.service";
import { matchRepository } from "@/lib/repositories/match.repository";
import {
  revalidateJudgeCourtPaths,
  revalidateOrganizerMatchPaths,
  revalidatePublicEventMatchPaths,
} from "@/features/matches/revalidate-organizer-match-paths";
import {
  confirmMatchResultsSchema,
  correctMatchResultSchema,
  voidMatchResultsSchema,
} from "@/lib/validators/result.validator";

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

function resolveFormData(a: unknown, b?: FormData): FormData | null {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return null;
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function revalidateAfterResultMutation(matchId: string): Promise<void> {
  const match = await matchRepository.findMatchWithBracketContext(matchId);
  if (!match) return;
  const eventId = match.bracket.eventId;
  const bracketId = match.bracketId;
  const publicSlug = match.bracket.event?.publicSlug ?? null;
  revalidateOrganizerMatchPaths(eventId, bracketId);
  revalidatePublicEventMatchPaths(publicSlug);
  if (match.courtId) {
    revalidateJudgeCourtPaths(match.courtId);
  }
}

async function resolveConfirmPrincipal(
  formData: FormData,
): Promise<ConfirmMatchResultsPrincipal> {
  const caller = await resolveFieldOpsCallerFromMutation(formData);
  if (caller.kind === "onsite-ops") {
    return { kind: "onsite-ops", eventId: caller.eventId };
  }
  return { kind: "organizer", actor: caller.actor };
}

export async function confirmMatchResultsAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = confirmMatchResultsSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      outcomeMode: formReq(formData, "outcomeMode"),
      winnerId: formReq(formData, "winnerId") || undefined,
      resultType: formReq(formData, "resultType"),
      resultMemo: formReq(formData, "resultMemo") || undefined,
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결과 확정 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const principal = await resolveConfirmPrincipal(formData);
    await resultService.confirmMatchResults(principal, parsed.data);
    await revalidateAfterResultMutation(parsed.data.matchId);
    return actionSuccess({ ok: true as const });
  });
}

export async function correctMatchResultAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = correctMatchResultSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      outcomeMode: formReq(formData, "outcomeMode"),
      winnerId: formReq(formData, "winnerId") || undefined,
      resultType: formReq(formData, "resultType"),
      resultMemo: formReq(formData, "resultMemo") || undefined,
      reason: formReq(formData, "reason"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "결과 정정 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const caller = await resolveFieldOpsCallerFromMutation(formData);
    await resultService.correctMatchResult(caller, parsed.data);
    await revalidateAfterResultMutation(parsed.data.matchId);
    return actionSuccess({ ok: true as const });
  });
}

export async function voidMatchResultsAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const parsed = voidMatchResultsSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      reason: formReq(formData, "reason"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "무효 처리 입력을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const caller = await resolveFieldOpsCallerFromMutation(formData);
    await resultService.voidMatchResults(caller, parsed.data);
    await revalidateAfterResultMutation(parsed.data.matchId);
    return actionSuccess({ ok: true as const });
  });
}
