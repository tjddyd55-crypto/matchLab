"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { dashboardPathForRole, isSupabaseAuthConfigured } from "@/lib/auth/actor";
import { authService } from "@/lib/services/auth.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fighterAccountService } from "@/lib/services/fighter-account.service";
import { signInWithPasswordFormSchema } from "@/lib/validators/auth.validator";

const PROFILE_NOT_LINKED_MESSAGE =
  "로그인은 성공했지만 앱 사용자 프로필이 연결되지 않았습니다. 관리자에게 authUserId 매핑을 확인해 주세요.";

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
    if (!isSupabaseAuthConfigured()) {
      return actionFailure(
        "INTERNAL",
        "Supabase 인증 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.",
      );
    }

    const parsed = signInWithPasswordFormSchema.safeParse({
      identifier: formReq(formData, "identifier") || formReq(formData, "email"),
      password: formReq(formData, "password"),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return actionFailure(
        "VALIDATION_ERROR",
        first?.message ?? "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      );
    }

    const authEmail = await fighterAccountService.resolveAuthEmailForLogin(
      parsed.data.identifier,
    );
    if (!authEmail) {
      return actionFailure(
        "UNAUTHORIZED",
        "이메일 또는 아이디가 올바르지 않습니다.",
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: parsed.data.password,
    });

    if (error || !data.user?.id) {
      return actionFailure(
        "UNAUTHORIZED",
        "이메일 또는 비밀번호가 올바르지 않습니다.",
        error?.message,
      );
    }

    const actor = await authService.getActorByAuthUserId(data.user.id);
    if (!actor) {
      await supabase.auth.signOut();
      return actionFailure("FORBIDDEN", PROFILE_NOT_LINKED_MESSAGE);
    }

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

export async function signOutAction(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return mapCaught(async () => {
    if (isSupabaseAuthConfigured()) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }
    return actionSuccess({ redirectTo: "/login" });
  });
}
