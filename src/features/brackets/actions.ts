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
import { bracketService } from "@/lib/services/bracket.service";
import {
  assignFighterToMatchSchema,
  createBracketSchema,
  createMatchListMatchesSchema,
  createSingleEliminationDraftSchema,
  publishBracketSchema,
  removeFighterFromMatchSchema,
  resetBracketSchema,
  unpublishBracketSchema,
  updateMatchOrderAndMatSchema,
} from "@/lib/validators/bracket.validator";

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

    const normalized = rows.map((item, idx) => {
      if (!item || typeof item !== "object") {
        throw new AppError(
          "VALIDATION_ERROR",
          `경기 ${idx + 1}행 데이터가 올바르지 않습니다.`,
        );
      }
      const r = item as Record<string, unknown>;
      return {
        fighterRedId: String(r.fighterRedId ?? ""),
        fighterBlueId: String(r.fighterBlueId ?? ""),
        matchOrder: Number(r.matchOrder),
        globalMatchOrder:
          r.globalMatchOrder === undefined || r.globalMatchOrder === ""
            ? undefined
            : Number(r.globalMatchOrder),
        matchNumber:
          r.matchNumber === undefined || r.matchNumber === ""
            ? undefined
            : Number(r.matchNumber),
        matNumber:
          r.matNumber === undefined || r.matNumber === ""
            ? undefined
            : Number(r.matNumber),
      };
    });

    const parsed = createMatchListMatchesSchema.safeParse({
      bracketId: formReq(formData, "bracketId"),
      matches: normalized,
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        "경기 목록 입력값을 확인해 주세요.",
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
