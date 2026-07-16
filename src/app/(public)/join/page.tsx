import Link from "next/link";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { buttonVariants } from "@/components/ui/button";
import {
  authLoginDescClass,
  authLoginFooterClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 회원가입 허브.
 * 협회 가입 카드는 계정 활성화 완성 전까지 노출하지 않는다.
 */
export default function JoinHubPage() {
  return (
    <AuthLoginShell
      title="MATCHON 회원가입"
      description="가입 유형을 선택해 주세요."
      footer={
        <p className={cn(authLoginFooterClass, "mt-6")}>
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            로그인
          </Link>
        </p>
      }
    >
      <div className="rounded-xl border border-matchon-border bg-matchon-surface/60 p-5 text-left">
        <h2 className="text-lg font-bold text-matchon-text-primary">
          체육관 가입 (회원사)
        </h2>
        <p className={cn(authLoginDescClass, "mt-2")}>
          소속 선수를 등록하고 대회에 참가하는 체육관입니다. 가입할 협회를
          선택한 뒤 기존 회원사 신청서를 작성합니다.
        </p>
        <Link
          href="/join/gym"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "mt-4 font-bold",
          )}
        >
          가입 신청
        </Link>
      </div>
    </AuthLoginShell>
  );
}
