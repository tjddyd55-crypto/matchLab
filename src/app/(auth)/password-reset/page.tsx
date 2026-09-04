import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { PasswordResetPhoneForm } from "@/components/domain/auth/PasswordResetPhoneForm";
import { BRAND_NAME } from "@/lib/brand";
import { loadMatchonPhoneVerificationConfig } from "@/server/phone-verification/config/matchon-phone-verification-config";

export const dynamic = "force-dynamic";

export default function PasswordResetPage() {
  const phoneConfig = loadMatchonPhoneVerificationConfig();
  const enabled = phoneConfig.passwordResetPhoneEnabled;
  return (
    <AuthLoginShell
      title={`${BRAND_NAME} 비밀번호 찾기`}
      description={
        enabled
          ? "아이디와 등록된 연락처로 본인 확인 후 새 비밀번호를 설정합니다. 기존 비밀번호는 확인할 수 없습니다."
          : "휴대폰 비밀번호 재설정 기능은 준비 중입니다. 관리자에게 문의해 주세요."
      }
    >
      <PasswordResetPhoneForm passwordResetPhoneEnabled={enabled} />
    </AuthLoginShell>
  );
}
