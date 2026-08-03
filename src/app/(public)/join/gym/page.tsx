import Link from "next/link";
import { GymJoinApplicationForm } from "@/components/domain/gym-join/GymJoinApplicationForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { loadMatchonPhoneVerificationConfig } from "@/server/phone-verification/config/matchon-phone-verification-config";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 독립 체육관 가입 — 중간 협회 선택 없음. 즉시 신청서 표시.
 * 협회 초대 가입은 /member-gym-register/[token] 유지.
 */
export default function JoinGymPage() {
  const phoneConfig = loadMatchonPhoneVerificationConfig();
  return (
    <AuthLoginShell
      title="체육관 가입"
      description="체육관 정보를 입력하고 가입 신청을 제출해 주세요."
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
      <GymJoinApplicationForm
        mode="independent"
        phoneVerificationEnabled={phoneConfig.signupPhoneVerificationEnabled}
      />
    </AuthLoginShell>
  );
}
