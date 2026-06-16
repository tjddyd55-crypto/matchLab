"use server";

import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { revalidatePath } from "next/cache";
import { bracketAutoMatchService } from "@/lib/services/bracket-auto-match.service";
import { bracketService } from "@/lib/services/bracket.service";
import { eventRepository } from "@/lib/repositories/event.repository";
import { eventService } from "@/lib/services/event.service";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import {
  assignFighterToMatchSchema,
  createBracketSchema,
  createMatchListMatchesSchema,
  createSingleEliminationDraftSchema,
  publishBracketSchema,
  removeFighterFromMatchSchema,
  eventBracketPublicationSchema,
  reorderBracketMatchSchema,
  resetBracketSchema,
  setPublicUnmatchedListSchema,
  unpublishBracketSchema,
  updateMatchOrderAndMatSchema,
} from "@/lib/validators/bracket.validator";
import { generateAutoBracketMatchesSchema } from "@/lib/validators/bracket-auto-match.validator";
import type { ZodError } from "zod";

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
    if (isPrismaUniqueViolation(e)) {
      return actionFailure(
        "CONFLICT",
        "대진표 저장 중 데이터 충돌이 발생했습니다. 선수 중복 배치 여부를 확인해 주세요.",
      );
    }
    console.error(e);
    return actionFailure("INTERNAL", "대진표 저장 중 오류가 발생했습니다.");
  });
}

function optionalFighterIdFromUnknown(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function optionalPositiveIntFromUnknown(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return undefined;
  return n;
}

function optionalNonNegIntFromUnknown(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}

function firstZodMessage(error: ZodError, fallback: string): string {
  const issue = error.issues[0];
  return issue?.message?.trim() ? issue.message : fallback;
}

/** `<form action>` 단일 인자 vs `useActionState(prev, formData)` 모두 지원 */
function resolveFormData(a: unknown, b?: FormData): FormData | null {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return null;
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function optPositiveInt(formData: FormData, key: string): number | undefined {
  const s = formReq(formData, key);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return undefined;
  return n;
}

function optNonNegInt(formData: FormData, key: string): number | undefined {
  const s = formReq(formData, key);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return undefined;
  return n;
}

/** 성공 시 클라이언트에서 `queryKeys.brackets.*`, `queryKeys.matches.*` 무효화 또는 `router.refresh()` — Realtime 단계에서 구독 연결. */

export async function createBracketAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ bracketId: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = createBracketSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      divisionId: formReq(formData, "divisionId") || undefined,
      title: formReq(formData, "title"),
      type: formReq(formData, "type"),
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    const result = await bracketService.createBracketForEvent(actor, parsed.data);
    return actionSuccess(result);
  });
}

export async function publishBracketAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = publishBracketSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "대진표 정보가 올바르지 않습니다.");
    }
    const actor = await requireActorFromMutation();
    await bracketService.publishBracket(actor, parsed.data.bracketId);
    return actionSuccess({ ok: true as const });
  });
}

export async function unpublishBracketAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = unpublishBracketSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "대진표 정보가 올바르지 않습니다.");
    }
    const actor = await requireActorFromMutation();
    await bracketService.unpublishBracket(actor, parsed.data.bracketId);
    return actionSuccess({ ok: true as const });
  });
}

export async function createMatchListMatchesAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    let rows: unknown;
    try {
      rows = JSON.parse(formReq(formData, "matchesPayload"));
    } catch {
      return actionFailure(
        "VALIDATION_ERROR",
        "경기 목록 데이터 형식이 올바르지 않습니다.",
      );
    }
    if (!Array.isArray(rows)) {
      return actionFailure("VALIDATION_ERROR", "경기 목록은 배열이어야 합니다.");
    }

    const normalized = rows
      .map((item, idx) => {
        if (!item || typeof item !== "object") {
          throw new AppError(
            "VALIDATION_ERROR",
            `경기 ${idx + 1}행 데이터가 올바르지 않습니다.`,
          );
        }
        const r = item as Record<string, unknown>;
        const fighterRedId = optionalFighterIdFromUnknown(r.fighterRedId);
        const fighterBlueId = optionalFighterIdFromUnknown(r.fighterBlueId);
        if (!fighterRedId && !fighterBlueId) {
          return null;
        }
        const matchOrderRaw = Number(r.matchOrder);
        return {
          fighterRedId,
          fighterBlueId,
          matchOrder: Number.isFinite(matchOrderRaw) ? matchOrderRaw : Number.NaN,
          globalMatchOrder: optionalNonNegIntFromUnknown(r.globalMatchOrder),
          matchNumber: optionalPositiveIntFromUnknown(r.matchNumber),
          matNumber: optionalPositiveIntFromUnknown(r.matNumber),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (normalized.length === 0) {
      return actionFailure(
        "VALIDATION_ERROR",
        "저장할 경기가 없습니다. 레드 또는 블루 선수를 한 명 이상 지정해 주세요.",
      );
    }

    const parsed = createMatchListMatchesSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      defaultCourtId: formReq(formData, "defaultCourtId"),
      matches: normalized,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        firstZodMessage(
          parsed.error,
          "경기 목록 입력값을 확인해 주세요.",
        ),
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await bracketService.createMatchListMatches(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function createSingleEliminationDraftAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const slotRaw = formReq(formData, "slotCount");
    const slotNum = Number(slotRaw);
    const parsed = createSingleEliminationDraftSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      courtId: formReq(formData, "courtId"),
      slotCount: slotNum,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "슬롯 수는 4·8·16 중 하나여야 합니다.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await bracketService.createSingleEliminationDraft(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function assignFighterToMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = assignFighterToMatchSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      matchId: formReq(formData, "matchId"),
      fighterId: formReq(formData, "fighterId"),
      slot: formReq(formData, "slot"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "선수 배치 입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await bracketService.assignFighterToMatch(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function reorderBracketMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = reorderBracketMatchSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      direction: formReq(formData, "direction"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "경기 순서 변경 입력값을 확인해 주세요.");
    }
    const actor = await requireActorFromMutation();
    await bracketService.reorderBracketMatch(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function reorderBracketMatchFormAction(
  formData: FormData,
): Promise<void> {
  await reorderBracketMatchAction(formData);
}

export async function updateMatchOrderAndMatAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = updateMatchOrderAndMatSchema.safeParse({
      matchId: formReq(formData, "matchId"),
      matchOrder: optNonNegInt(formData, "matchOrder"),
      globalMatchOrder: optNonNegInt(formData, "globalMatchOrder"),
      matNumber: optPositiveInt(formData, "matNumber"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "순서·매트 입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await bracketService.updateMatchOrderAndMat(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function removeFighterFromMatchAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = removeFighterFromMatchSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      matchId: formReq(formData, "matchId"),
      slot: formReq(formData, "slot"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "매치 정보가 올바르지 않습니다.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    await bracketService.removeFighterFromMatch(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

export async function resetBracketAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ ok: true }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = resetBracketSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      reason: formReq(formData, "reason") || undefined,
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "대진표 정보가 올바르지 않습니다.");
    }
    const actor = await requireActorFromMutation();
    await bracketService.resetBracket(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}

/** `<form action>` 전용 — Next.js 가 기대하는 `Promise<void>` 반환 */
export async function publishBracketFormAction(formData: FormData): Promise<void> {
  await publishBracketAction(formData);
}

export async function unpublishBracketFormAction(formData: FormData): Promise<void> {
  await unpublishBracketAction(formData);
}

export async function createSingleEliminationDraftFormAction(
  formData: FormData,
): Promise<void> {
  await createSingleEliminationDraftAction(formData);
}

export async function resetBracketFormAction(formData: FormData): Promise<void> {
  await resetBracketAction(formData);
}

export async function assignFighterToMatchFormAction(
  formData: FormData,
): Promise<void> {
  await assignFighterToMatchAction(formData);
}

export async function removeFighterFromMatchFormAction(
  formData: FormData,
): Promise<void> {
  await removeFighterFromMatchAction(formData);
}

export async function updateMatchOrderAndMatFormAction(
  formData: FormData,
): Promise<void> {
  await updateMatchOrderAndMatAction(formData);
}

function parseCheckbox(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

async function revalidateBracketPublicPaths(eventId: string): Promise<void> {
  const settings = await eventRepository.findEventPublicationSettings(eventId);
  revalidatePath(`/organizer/events/${eventId}/brackets`);
  if (settings?.publicSlug) {
    revalidatePath(`/events/${settings.publicSlug}/brackets`);
    revalidatePath(`/events/${settings.publicSlug}`);
  }
}

export async function publishAllEventBracketsAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ published: number }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = eventBracketPublicationSchema.safeParse({
      eventId: formReq(formData, "eventId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "대회 정보가 올바르지 않습니다.");
    }
    const actor = await requireActorFromMutation();
    const result = await bracketService.publishAllEventBrackets(
      actor,
      parsed.data.eventId,
    );
    await revalidateBracketPublicPaths(parsed.data.eventId);
    return actionSuccess(result);
  });
}

export async function unpublishAllEventBracketsAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ unpublished: number }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = eventBracketPublicationSchema.safeParse({
      eventId: formReq(formData, "eventId"),
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "대회 정보가 올바르지 않습니다.");
    }
    const actor = await requireActorFromMutation();
    const result = await bracketService.unpublishAllEventBrackets(
      actor,
      parsed.data.eventId,
    );
    await revalidateBracketPublicPaths(parsed.data.eventId);
    return actionSuccess(result);
  });
}

export async function setPublicUnmatchedListAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ enabled: boolean }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const enabledRaw = formReq(formData, "enabled");
    const parsed = setPublicUnmatchedListSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      enabled:
        enabledRaw === "true" ||
        enabledRaw === "on" ||
        enabledRaw === "1",
    });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    const actor = await requireActorFromMutation();
    await eventService.setPublicUnmatchedListEnabled(
      actor,
      parsed.data.eventId,
      parsed.data.enabled,
    );
    await revalidateBracketPublicPaths(parsed.data.eventId);
    return actionSuccess({ enabled: parsed.data.enabled });
  });
}

export async function publishAllEventBracketsFormAction(
  formData: FormData,
): Promise<void> {
  await publishAllEventBracketsAction(formData);
}

export async function unpublishAllEventBracketsFormAction(
  formData: FormData,
): Promise<void> {
  await unpublishAllEventBracketsAction(formData);
}

export async function setPublicUnmatchedListFormAction(
  formData: FormData,
): Promise<void> {
  await setPublicUnmatchedListAction(formData);
}

export async function generateAutoBracketMatchesAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<
  ActionResult<
    Awaited<
      ReturnType<
        typeof bracketAutoMatchService.generateAutoBracketMatchesForEvent
      >
    >
  >
> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }
  return mapCaught(async () => {
    const parsed = generateAutoBracketMatchesSchema.safeParse({
      eventId: formReq(formData, "eventId"),
      eligibleOnly: parseCheckbox(formData, "eligibleOnly"),
      resetExisting: parseCheckbox(formData, "resetExisting"),
      previewOnly: parseCheckbox(formData, "previewOnly"),
      autoMatchScope: formReq(formData, "autoMatchScope") || undefined,
      targetCourtId: formReq(formData, "targetCourtId") || undefined,
      maxMatchesPerCourt: formReq(formData, "maxMatchesPerCourt")
        ? Number(formReq(formData, "maxMatchesPerCourt"))
        : undefined,
      forbidSameGym: formData.has("forbidSameGym")
        ? parseCheckbox(formData, "forbidSameGym")
        : true,
      preserveManualCourts: formData.has("preserveManualCourts")
        ? parseCheckbox(formData, "preserveManualCourts")
        : true,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "자동 대진 생성 입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }
    const actor = await requireActorFromMutation();
    const summary =
      await bracketAutoMatchService.generateAutoBracketMatchesForEvent(
        actor,
        parsed.data,
      );
    return actionSuccess(summary);
  });
}
