"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import {
  dashboardPathForRole,
  isSupabaseAuthConfigured,
} from "@/lib/auth/actor";
import {
  DESKTOP_LAUNCH_PATH,
  DESKTOP_LOGIN_PATH,
  DESKTOP_MANAGER_UNAVAILABLE_MESSAGE,
} from "@/lib/desktop/constants";
import { isDesktopManagerRole } from "@/lib/desktop/manager-roles";
import { isMatchonDesktopRequest } from "@/lib/desktop/request";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import {
  authenticateWithPassword,
  revokeCurrentAuthSession,
} from "@/features/auth/authenticate-password";

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

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    console.error(e);
    return actionFailure(
      "INTERNAL",
      "처리 중 오류가 발생했습니다.",
    );
  });
}

export async function signInWithPasswordAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const auth = await authenticateWithPassword(
      formReq(formData, "identifier") || formReq(formData, "email"),
      formReq(formData, "password"),
    );
    if (!auth.ok) return auth.result;

    const { actor } = auth;

    if (actor.role === "fighter" && actor.mustChangePassword) {
      return actionSuccess({ redirectTo: "/fighter/change-password" });
    }

    if (actor.role === "fighter" && !actor.fighterId) {
      const gate = await fighterAccountService.getFighterRegistrationGate(
        actor,
      );
      if (gate.kind === "pending") {
        return actionSuccess({ redirectTo: "/fighter/pending" });
      }
      if (gate.kind === "rejected") {
        return actionSuccess({ redirectTo: "/fighter/rejected" });
      }
      if (gate.kind === "no_fighter_link") {
        return actionSuccess({ redirectTo: "/fighter/unlinked" });
      }
    }

    return actionSuccess({
      redirectTo: dashboardPathForRole(actor.role),
    });
  });
}

/**
 * MATCHON Manager PC 로그인 — 동일 인증 코어, 관리자 역할만 허용 후 /desktop/launch.
 */
export async function signInWithPasswordDesktopAction(
  arg1: unknown,
  arg2?: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const formData = resolveFormData(arg1, arg2);
  if (!formData) {
    return actionFailure("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.");
  }

  return mapCaught(async () => {
    const auth = await authenticateWithPassword(
      formReq(formData, "identifier") || formReq(formData, "email"),
      formReq(formData, "password"),
    );
    if (!auth.ok) return auth.result;

    if (!isDesktopManagerRole(auth.actor.role)) {
      await revokeCurrentAuthSession();
      return actionFailure("FORBIDDEN", DESKTOP_MANAGER_UNAVAILABLE_MESSAGE);
    }

    return actionSuccess({ redirectTo: DESKTOP_LAUNCH_PATH });
  });
}

export async function signOutAction(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return mapCaught(async () => {
    if (isSupabaseAuthConfigured()) {
      await revokeCurrentAuthSession();
    }
    const desktop = await isMatchonDesktopRequest();
    return actionSuccess({
      redirectTo: desktop ? DESKTOP_LOGIN_PATH : "/login",
    });
  });
}
