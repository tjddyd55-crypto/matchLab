import { ChangePasswordForm } from "@/components/domain/auth/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function FighterChangePasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          비밀번호 변경
        </h1>
        <p className="text-muted-foreground text-sm">
          체육관에서 발급한 임시 비밀번호를 사용 중입니다. 새 비밀번호를 설정해
          주세요.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 비밀번호 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
