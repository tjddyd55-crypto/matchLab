import Link from "next/link";
import { AssociationApplicationForm } from "@/components/domain/association-applications/AssociationApplicationForm";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function JoinAssociationPage() {
  return (
    <AuthLoginShell
      title="협회 가입 신청"
      description="신청서를 제출하면 슈퍼어드민 검토 후 협회 관리자 계정이 초대됩니다. 즉시 활성 계정은 생성되지 않습니다."
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
      <AssociationApplicationForm />
    </AuthLoginShell>
  );
}
