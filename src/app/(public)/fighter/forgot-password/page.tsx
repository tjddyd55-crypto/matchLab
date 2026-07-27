import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FighterForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-bold text-matchon-text-primary">
        비밀번호 찾기
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-matchon-text-secondary">
        휴대폰·이메일 본인 인증(OTP)은 아직 준비 중입니다.
        <br />
        지금은 소속 체육관에 비밀번호 재설정 링크를 요청해 주세요.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-matchon-text-secondary">
        계정이 아직 없다면, 체육관에서 받은 계정 설정 링크로 아이디와 비밀번호를
        먼저 만들어 주세요.
      </p>
      <p className="mt-6 text-sm">
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인 화면으로 돌아가기
        </Link>
      </p>
    </main>
  );
}
