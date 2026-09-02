import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CreateMatchonAuthUserInput = {
  authEmail: string;
  password: string;
  userMetadata?: Record<string, unknown>;
  /** 서버 로그·에러 추적용 (예: gym-application.submit) */
  logContext: string;
  requestedLoginId?: string;
};

export function maskLoginId(loginId: string | undefined): string | undefined {
  if (!loginId) return undefined;
  const id = loginId.trim();
  if (id.length <= 2) return `${id[0] ?? "*"}*`;
  return `${id.slice(0, 2)}***${id.slice(-1)}`;
}

function isDuplicateAuthError(message: string | undefined): boolean {
  const msg = (message ?? "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("registered") ||
    msg.includes("duplicate")
  );
}

function mapAuthCreateError(errorMessage: string | undefined): AppError {
  const msg = (errorMessage ?? "").toLowerCase();
  if (isDuplicateAuthError(msg)) {
    return new AppError(
      "CONFLICT",
      "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      errorMessage,
    );
  }
  if (msg.includes("password") || msg.includes("weak")) {
    return new AppError(
      "VALIDATION_ERROR",
      "비밀번호 요건을 확인해 주세요.",
      errorMessage,
    );
  }
  if (msg.includes("invalid") && msg.includes("email")) {
    return new AppError(
      "VALIDATION_ERROR",
      "로그인 아이디 형식을 확인해 주세요.",
      errorMessage,
    );
  }
  return new AppError(
    "INTERNAL",
    "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
    errorMessage,
  );
}

/**
 * Supabase Auth 계정 생성 + orphan(앱 User 미연결) 복구.
 * 체육관·협회 가입 등 loginId synthetic email 흐름에서 공통 사용.
 */
export async function createMatchonAuthUserWithRecovery(
  input: CreateMatchonAuthUserInput,
): Promise<string> {
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (e) {
    console.error(`[${input.logContext}] supabase admin client unavailable`, {
      loginIdMasked: maskLoginId(input.requestedLoginId),
      error: e instanceof Error ? e.message : String(e),
    });
    throw new AppError(
      "INTERNAL",
      "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
      e instanceof Error ? e.message : undefined,
    );
  }

  const createPayload = {
    email: input.authEmail,
    password: input.password,
    email_confirm: true,
    ...(input.userMetadata ? { user_metadata: input.userMetadata } : {}),
  };

  const { data, error } = await supabase.auth.admin.createUser(createPayload);
  if (data.user?.id) {
    console.info(`[${input.logContext}] auth user created`, {
      loginIdMasked: maskLoginId(input.requestedLoginId),
      stage: "auth_create_success",
    });
    return data.user.id;
  }

  if (!error) {
    console.error(
      `[${input.logContext}] auth create returned no user and no error`,
      {
        loginIdMasked: maskLoginId(input.requestedLoginId),
        stage: "auth_create_empty",
      },
    );
    throw new AppError(
      "INTERNAL",
      "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
    );
  }

  console.warn(`[${input.logContext}] auth create failed`, {
    loginIdMasked: maskLoginId(input.requestedLoginId),
    stage: "auth_create_failed",
    supabaseCode: (error as { status?: number }).status,
  });

  if (isDuplicateAuthError(error.message)) {
    const listed = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const orphan = (listed.data?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === input.authEmail.toLowerCase(),
    );

    if (orphan) {
      const linkedUser = await prisma.user.findFirst({
        where: { authUserId: orphan.id },
        select: { id: true },
      });
      if (linkedUser) {
        throw new AppError(
          "CONFLICT",
          "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
          error.message,
        );
      }

      const pendingGymApp = await prisma.gymApplication.findFirst({
        where: { pendingAuthUserId: orphan.id, deletedAt: null },
        select: { id: true },
      });
      if (pendingGymApp) {
        throw new AppError(
          "CONFLICT",
          "이미 가입 신청이 접수되었습니다.\n신청한 계정으로 로그인하거나 관리자 승인을 기다려 주세요.",
          error.message,
        );
      }

      await supabase.auth.admin.deleteUser(orphan.id);
      console.info(
        `[${input.logContext}] deleted orphan auth user, retrying create`,
        {
          loginIdMasked: maskLoginId(input.requestedLoginId),
          stage: "orphan_recovery_retry",
        },
      );

      const retry = await supabase.auth.admin.createUser(createPayload);
      if (retry.data.user?.id) {
        console.info(`[${input.logContext}] auth user created after orphan recovery`, {
          loginIdMasked: maskLoginId(input.requestedLoginId),
          stage: "orphan_recovery_success",
        });
        return retry.data.user.id;
      }

      console.error(`[${input.logContext}] auth create retry failed`, {
        loginIdMasked: maskLoginId(input.requestedLoginId),
        stage: "orphan_recovery_retry_failed",
      });
    }

    throw new AppError(
      "CONFLICT",
      "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      error.message,
    );
  }

  throw mapAuthCreateError(error.message);
}
