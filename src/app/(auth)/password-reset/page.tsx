import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { PasswordResetPhoneForm } from "@/components/domain/auth/PasswordResetPhoneForm";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function PasswordResetPage() {
  return (
    <AuthLoginShell
      title={`${BRAND_NAME} 비밀번호 찾기`}
      description="아이디와 등록된 휴대폰 번호로 본인 확인 후 새 비밀번호를 설정합니다. 기존 비밀번호는 확인할 수 없습니다."
    >
      <PasswordResetPhoneForm />
    </AuthLoginShell>
  );
}
