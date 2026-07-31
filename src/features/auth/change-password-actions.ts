"use server";

import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { dashboardPathForRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fighterAccountRepository } from "@/lib/repositories/fighter-account.repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { changePasswordSchema } from "@/lib/validators/fighter-account.validator";
import { userRepository } from "@/lib/repositories/user.repository";

export async function changeFighterPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const actor = await requireActorFromMutation();
    if (actor.role !== "fighter" && actor.role !== "gym_staff") {
      return actionFailure("FORBIDDEN", "비밀번호를 변경할 수 없습니다.");
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      newPasswordConfirm: formData.get("newPasswordConfirm"),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" ");
      return actionFailure("VALIDATION_ERROR", msg || "입력값을 확인해 주세요.");
    }

    const user = await userRepository.findUserById(actor.userId);
    if (!user?.authUserId) {
      return actionFailure("FORBIDDEN", "비밀번호를 변경할 수 없습니다.");
    }

    const supabase = await createSupabaseServerClient();
    const authEmail = user.email;
    if (!authEmail) {
      return actionFailure("FORBIDDEN", "계정 이메일 정보가 없습니다.");
    }

    const check = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: parsed.data.currentPassword,
    });
    if (check.error) {
      return actionFailure(
        "UNAUTHORIZED",
        "현재 비밀번호가 올바르지 않습니다.",
      );
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.authUserId, {
      password: parsed.data.newPassword,
    });
    if (error) {
      return actionFailure("INTERNAL", "비밀번호 변경에 실패했습니다.");
    }

    await fighterAccountRepository.updatePasswordFlags(actor.userId, {
      mustChangePassword: false,
    });

    let redirectTo = dashboardPathForRole(actor.role);
    if (actor.role === "fighter") {
      redirectTo = actor.fighterId ? "/fighter" : "/fighter/unlinked";
    } else if (actor.role === "gym_staff") {
      redirectTo = "/gym";
    }

    return actionSuccess({ redirectTo });
  } catch (e) {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  }
}
