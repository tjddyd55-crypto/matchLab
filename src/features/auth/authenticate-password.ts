import "server-only";

import {
  actionFailure,
  type ActionResult,
} from "@/lib/action-result";
import type { ActorContext } from "@/lib/auth/actor-context";
import { isSupabaseAuthConfigured } from "@/lib/auth/actor";
import { authService } from "@/lib/services/auth.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInWithPasswordFormSchema } from "@/lib/validators/auth.validator";

const PROFILE_NOT_LINKED_MESSAGE =
  "로그인은 성공했지만 앱 사용자 프로필이 연결되지 않았습니다. 관리자에게 authUserId 매핑을 확인해 주세요.";

export type AuthenticatePasswordOk = {
  ok: true;
  actor: ActorContext;
};

export type AuthenticatePasswordFail = {
  ok: false;
  result: ActionResult<never>;
};

/**
 * identifier+password → Supabase Auth + Actor.
 * 웹/desktop 로그인 action이 공유하는 인증 코어.
 */
export async function authenticateWithPassword(
  identifier: string,
  password: string,
): Promise<AuthenticatePasswordOk | AuthenticatePasswordFail> {
  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      result: actionFailure(
        "INTERNAL",
        "Supabase 인증 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.",
      ),
    };
  }

  const parsed = signInWithPasswordFormSchema.safeParse({
    identifier,
    password,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      result: actionFailure(
        "VALIDATION_ERROR",
        first?.message ?? "입력값을 확인해 주세요.",
        parsed.error.flatten(),
      ),
    };
  }

  const authEmail = await authService.resolveAuthEmailForLogin(
    parsed.data.identifier,
  );
  if (!authEmail) {
    return {
      ok: false,
      result: actionFailure(
        "UNAUTHORIZED",
        "아이디 또는 비밀번호를 확인해 주세요.",
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: parsed.data.password,
  });

  if (error || !data.user?.id) {
    return {
      ok: false,
      result: actionFailure(
        "UNAUTHORIZED",
        "아이디 또는 비밀번호를 확인해 주세요.",
        error?.message,
      ),
    };
  }

  const actor = await authService.getActorByAuthUserId(data.user.id);
  if (!actor) {
    await supabase.auth.signOut();
    return {
      ok: false,
      result: actionFailure("FORBIDDEN", PROFILE_NOT_LINKED_MESSAGE),
    };
  }

  return { ok: true, actor };
}

export async function revokeCurrentAuthSession(): Promise<void> {
  if (!isSupabaseAuthConfigured()) return;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
