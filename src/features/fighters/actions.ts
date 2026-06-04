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
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import { fighterService } from "@/lib/services/fighter.service";
import {
  gymFighterCreateSchema,
  gymFighterUpdateSchema,
} from "@/lib/validators/gym-fighter.validator";

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
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function payloadFromGymFighterForm(formData: FormData): unknown {
  const gv = (k: string): string | undefined => {
    const v = formData.get(k);
    if (v === null || typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? undefined : t;
  };
  return {
    name: formReq(formData, "name"),
    birthDate: formReq(formData, "birthDate"),
    gender: formReq(formData, "gender"),
    phone: gv("phone"),
    height: formData.get("height"),
    weight: formData.get("weight"),
    primarySport: gv("primarySport"),
    guardianName: gv("guardianName"),
    guardianPhone: gv("guardianPhone"),
    gymInternalMemo: gv("gymInternalMemo"),
    confirmDuplicateLink: gv("confirmDuplicateLink"),
    linkFighterId: gv("linkFighterId"),
    createLoginAccount: gv("createLoginAccount"),
    loginId: gv("loginId"),
    password: gv("password"),
    autoGeneratePassword: gv("autoGeneratePassword"),
    fighterId: gv("fighterId"),
    status: gv("status"),
    releaseAffiliation: gv("releaseAffiliation"),
  };
}

export async function createGymFighterDirectAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  ActionResult<{
    fighterId: string;
    fighterCode: string;
    linked: boolean;
    duplicateCandidates?: { id: string; fighterCode: string; name: string }[];
    loginCredentials?: { loginId: string; temporaryPassword: string };
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymFighterCreateSchema.safeParse(
      payloadFromGymFighterForm(formData),
    );
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" ");
      return actionFailure(
        "VALIDATION_ERROR",
        msg || "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    try {
      const result = await fighterService.createFighterDirectlyForGym(
        actor,
        parsed.data,
      );
      return actionSuccess(result);
    } catch (e) {
      if (
        e instanceof AppError &&
        e.code === "CONFLICT" &&
        e.details &&
        typeof e.details === "object" &&
        "candidates" in e.details
      ) {
        const candidates = (
          e.details as { candidates: { id: string; fighterCode: string; name: string }[] }
        ).candidates;
        return actionFailure("CONFLICT", e.message, { duplicateCandidates: candidates });
      }
      throw e;
    }
  });
}

export async function releaseGymFighterAffiliationAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const fighterId = formReq(formData, "fighterId");
    if (!fighterId) {
      return actionFailure("VALIDATION_ERROR", "선수 ID가 필요합니다.");
    }
    await fighterService.releaseGymFighterAffiliation(actor, fighterId);
    return actionSuccess({ ok: true as const });
  });
}

export async function provisionGymFighterAccountAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  ActionResult<{
    loginId: string;
    temporaryPassword: string;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const fighterId = formReq(formData, "fighterId");
    const loginId = formReq(formData, "loginId");
    const password = formReq(formData, "password");
    const auto = formReq(formData, "autoGeneratePassword") === "true";
    if (!fighterId || !loginId) {
      return actionFailure("VALIDATION_ERROR", "입력값을 확인해 주세요.");
    }
    const result = await fighterAccountService.provisionAccountForGymFighter(
      actor,
      fighterId,
      {
        loginId,
        password: password || undefined,
        autoGeneratePassword: auto || !password,
      },
    );
    return actionSuccess({
      loginId: result.loginId,
      temporaryPassword: result.temporaryPassword ?? "",
    });
  });
}

export async function resetGymFighterPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  ActionResult<{
    loginId: string;
    temporaryPassword: string;
  }>
> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const fighterId = formReq(formData, "fighterId");
    if (!fighterId) {
      return actionFailure("VALIDATION_ERROR", "선수 ID가 필요합니다.");
    }
    const password = formReq(formData, "password");
    const auto = formReq(formData, "autoGeneratePassword") === "true";
    const result = await fighterAccountService.resetFighterPassword(
      actor,
      fighterId,
      {
        password: password || undefined,
        autoGenerate: auto || !password,
      },
    );
    return actionSuccess(result);
  });
}

export async function updateGymFighterAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymFighterUpdateSchema.safeParse(
      payloadFromGymFighterForm(formData),
    );
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" ");
      return actionFailure(
        "VALIDATION_ERROR",
        msg || "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    await fighterService.updateGymFighter(actor, parsed.data);
    return actionSuccess({ ok: true as const });
  });
}
