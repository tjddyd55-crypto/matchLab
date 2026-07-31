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

    // 현재 세션에서 비밀번호를 바꿔 세션 쿠키를 유지한다.
    // admin.updateUserById 는 세션을 무효화해 변경 직후 /login 으로 튕길 수 있다.
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (error) {
      // 세션 updateUser 실패 시 admin 경로로 재시도한 뒤 새 비밀번호로 재로그인
      const admin = createSupabaseAdminClient();
      const adminUpdate = await admin.auth.admin.updateUserById(
        user.authUserId,
        { password: parsed.data.newPassword },
      );
      if (adminUpdate.error) {
        return actionFailure("INTERNAL", "비밀번호 변경에 실패했습니다.");
      }
      const refresh = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: parsed.data.newPassword,
      });
      if (refresh.error) {
        return actionFailure(
          "INTERNAL",
          "비밀번호는 변경되었지만 세션을 갱신하지 못했습니다. 다시 로그인해 주세요.",
        );
      }
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
