import { ChangePasswordForm } from "@/components/domain/auth/ChangePasswordForm";
import { requireActor } from "@/lib/auth/actor";
import { redirect } from "next/navigation";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";

export default async function GymStaffChangePasswordPage() {
  const actor = await requireActor();
  if (actor.role !== "gym_staff") {
    redirect("/gym");
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={`${matchonPageStackClass} mx-auto max-w-md`}>
        <div className="space-y-1">
          <h1 className={matchonPageTitleClass}>비밀번호 변경</h1>
          <p className={matchonPageDescClass}>
            임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정한 뒤 체육관
            기능을 사용할 수 있습니다.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
