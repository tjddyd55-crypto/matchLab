import { ChangePasswordForm } from "@/components/domain/auth/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default function FighterChangePasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">비밀번호 변경</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          체육관에서 발급한 임시 비밀번호를 사용 중입니다. 새 비밀번호를
          설정해 주세요.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
