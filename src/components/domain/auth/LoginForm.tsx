"use client";

import Link from "next/link";
import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { signInWithPasswordAction } from "@/features/auth/actions";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

/**
 * 일반 로그인 — AuthLoginForm SSOT + 일반 auth action.
 */
export function LoginForm({
  defaultLoginId,
  activatedBanner,
}: {
  defaultLoginId?: string;
  activatedBanner?: boolean;
}) {
  return (
    <AuthLoginForm
      identifierName="identifier"
      identifierLabel="아이디"
      defaultIdentifier={defaultLoginId}
      identifierPlaceholder="아이디를 입력하세요"
      action={signInWithPasswordAction}
      banner={
        activatedBanner ? (
          <p
            className="rounded-lg border border-matchon-primary/30 bg-matchon-primary-light/40 px-3 py-2.5 text-[0.9375rem] leading-relaxed text-matchon-text-primary"
            role="status"
          >
            회원사 계정이 활성화되었습니다.
            <br />
            설정한 아이디와 비밀번호로 로그인해 주세요.
          </p>
        ) : null
      }
      secondaryNote="관리자, 주최자, 체육관, 선수 모두 발급받은 아이디로 로그인합니다."
      footer={
        <div className={cn(authLoginFooterClass, "space-y-2")}>
          <p>
            비밀번호를 잊으셨나요?{" "}
            <Link
              href="/fighter/forgot-password"
              className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              비밀번호 찾기
            </Link>
          </p>
          <p className="text-[0.8125rem] leading-relaxed">
            체육관에서 받은 계정 설정 링크가 있다면 링크로 먼저 아이디와
            비밀번호를 만들어 주세요.
          </p>
          <p>
            계정이 없으신가요?{" "}
            <Link
              href="/join"
              className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              안내 보기
            </Link>
          </p>
        </div>
      }
    />
  );
}
