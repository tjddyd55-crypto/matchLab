import Link from "next/link";
import { GymApplicationForm } from "@/components/domain/gym-applications/GymApplicationForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 독립 체육관 가입 — 협회 선택 없음.
 * 협회 전용 회원사 모집은 /member-gym-register/[token] 유지.
 */
export default function JoinGymPage() {
  return (
    <AuthLoginShell
      title="체육관 가입 신청"
      description="신청서를 제출하면 플랫폼 관리자 검토 후 체육관 계정이 초대됩니다. 협회 소속은 가입과 별도입니다."
      footer={
        <p className={cn(authLoginFooterClass, "mt-6")}>
          <Link
            href="/join"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 가입 유형 선택
          </Link>
        </p>
      }
    >
      <GymApplicationForm />
    </AuthLoginShell>
  );
}
