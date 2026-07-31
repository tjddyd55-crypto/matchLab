"use client";

import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { signInWithPasswordDesktopAction } from "@/features/auth/actions";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager PC 로그인 — AuthLoginForm SSOT + desktop action.
 */
export function DesktopLoginForm() {
  return (
    <AuthLoginForm
      identifierName="identifier"
      identifierLabel="아이디"
      identifierPlaceholder="아이디를 입력하세요"
      action={signInWithPasswordDesktopAction}
      secondaryNote="로그인 세션은 서버에서 유지됩니다. 비밀번호는 기기에 저장되지 않습니다."
      footer={
        <div className={cn(authLoginFooterClass, "space-y-2")}>
          <p>
            계정에 문제가 있나요?
            <br />
            관리자에게 문의해 주세요.
          </p>
        </div>
      }
    />
  );
}
