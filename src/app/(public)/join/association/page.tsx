import Link from "next/link";
import { AssociationApplicationForm } from "@/components/domain/association-applications/AssociationApplicationForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { loadMatchonPhoneVerificationConfig } from "@/server/phone-verification/config/matchon-phone-verification-config";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function JoinAssociationPage() {
  const phoneConfig = loadMatchonPhoneVerificationConfig();
  return (
    <AuthLoginShell
      title="협회 가입 신청"
      description="협회 정보를 입력하고 가입 신청을 제출해 주세요."
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
      <AssociationApplicationForm
        phoneVerificationEnabled={phoneConfig.signupPhoneVerificationEnabled}
      />
    </AuthLoginShell>
  );
}
