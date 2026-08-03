import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { AuditAction } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { passwordSchema } from "@/lib/validators/password.validator";

export type PasswordResetMethod =
  | "phone_verification"
  | "admin_reset_link";

/**
 * 휴대폰 OTP / 관리자 링크 공통 비밀번호 변경.
 * - service role updateUserById 로 Auth 세션·refresh 무효화
 * - 비밀번호 변경 실패 시 credential consume 콜백을 호출하지 않음
 */
export async function completePasswordReset(input: {
  userId: string;
  authUserId: string;
  newPassword: string;
  resetMethod: PasswordResetMethod;
  credentialId: string;
  auditAction: AuditAction;
  auditAfterData?: Record<string, unknown>;
  /** Auth 업데이트 성공 후에만 실행 (consume). 실패 시 throw → 호출부 중단 */
  consumeCredential: () => Promise<void>;
}): Promise<{ ok: true }> {
  const parsed = passwordSchema.safeParse(input.newPassword);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "비밀번호 정책을 확인해 주세요.",
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: input.userId },
    select: { id: true, authUserId: true },
  });
  if (!user?.authUserId || user.authUserId !== input.authUserId) {
    throw new AppError("NOT_FOUND", "계정을 찾을 수 없습니다.");
  }

  const admin = createSupabaseAdminClient();
  // admin.updateUserById(password) 는 Auth 측에서 기존 refresh session을 폐기한다.
  const updated = await admin.auth.admin.updateUserById(user.authUserId, {
    password: parsed.data,
  });
  if (updated.error) {
    throw new AppError("INTERNAL", "비밀번호 변경에 실패했습니다.");
  }

  await input.consumeCredential();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mustChangePassword: false,
      passwordResetAt: new Date(),
    },
  });

  await auditRepository.createAuditLog({
    actorUserId: user.id,
    action: input.auditAction,
    targetType: "User",
    targetId: user.id,
    afterData: {
      resetMethod: input.resetMethod,
      credentialId: input.credentialId,
      sessionInvalidation: "admin_password_update_revokes_sessions",
      ...(input.auditAfterData ?? {}),
    },
  });

  return { ok: true as const };
}
