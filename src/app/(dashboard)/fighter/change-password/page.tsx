import { ChangePasswordForm } from "@/components/domain/auth/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function FighterChangePasswordPage() {
  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-md")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>비밀번호 변경</h1>
          <p className={matchonPageDescClass}>
            체육관에서 발급한 임시 비밀번호를 사용 중입니다. 새 비밀번호를 설정해
            주세요.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className={matchonSectionTitleClass}>새 비밀번호 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
