import Link from "next/link";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function FighterForgotPasswordPage() {
  return (
    <AuthLoginShell layout="onboarding" title="비밀번호 찾기">
      <p className="text-base leading-relaxed text-matchon-text-secondary">
        휴대폰·이메일 본인 인증(OTP)은 아직 준비 중입니다.
        <br />
        지금은 소속 체육관에 비밀번호 재설정 링크를 요청해 주세요.
      </p>
      <p className="mt-2 text-base leading-relaxed text-matchon-text-secondary">
        계정이 아직 없다면, 체육관에서 받은 계정 설정 링크로 아이디와 비밀번호를
        먼저 만들어 주세요.
      </p>
      <p className={cn(authLoginFooterClass, "mt-6")}>
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인 화면으로 돌아가기
        </Link>
      </p>
    </AuthLoginShell>
  );
}
