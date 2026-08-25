import "server-only";

import {
  actionFailure,
  type ActionResult,
} from "@/lib/action-result";
import type { ActorContext } from "@/lib/auth/actor-context";
import { isSupabaseAuthConfigured } from "@/lib/auth/actor";
import { GymApplicationStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { authService } from "@/lib/services/auth.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLoginId } from "@/lib/validators/login-id.validator";
import { signInWithPasswordFormSchema } from "@/lib/validators/auth.validator";

const PROFILE_NOT_LINKED_MESSAGE =
  "로그인은 성공했지만 앱 사용자 프로필이 연결되지 않았습니다. 관리자에게 authUserId 매핑을 확인해 주세요.";

const GYM_APPLICATION_PENDING_MESSAGE =
  "가입 신청이 관리자 승인 대기 중입니다. 승인 후 같은 아이디·비밀번호로 로그인할 수 있습니다.";

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
    const pendingMessage = await pendingGymApplicationLoginMessage(
      parsed.data.identifier,
    );
    return {
      ok: false,
      result: actionFailure(
        pendingMessage ? "FORBIDDEN" : "UNAUTHORIZED",
        pendingMessage ?? "아이디 또는 비밀번호를 확인해 주세요.",
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
    const pendingMessage = await pendingGymApplicationLoginMessage(
      parsed.data.identifier,
      data.user.id,
    );
    return {
      ok: false,
      result: actionFailure(
        "FORBIDDEN",
        pendingMessage ?? PROFILE_NOT_LINKED_MESSAGE,
      ),
    };
  }

  return { ok: true, actor };
}

async function pendingGymApplicationLoginMessage(
  identifier: string,
  authUserId?: string,
): Promise<string | null> {
  const loginId = normalizeLoginId(identifier.trim());
  const or: Array<
    { requestedLoginId: string } | { pendingAuthUserId: string }
  > = [];
  if (loginId.length >= 4) {
    or.push({ requestedLoginId: loginId });
  }
  if (authUserId) {
    or.push({ pendingAuthUserId: authUserId });
  }
  if (or.length === 0) return null;

  const row = await prisma.gymApplication.findFirst({
    where: {
      deletedAt: null,
      status: {
        in: [GymApplicationStatus.pending, GymApplicationStatus.under_review],
      },
      OR: or,
    },
    select: { id: true },
  });
  return row ? GYM_APPLICATION_PENDING_MESSAGE : null;
}

export async function revokeCurrentAuthSession(): Promise<void> {
  if (!isSupabaseAuthConfigured()) return;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
