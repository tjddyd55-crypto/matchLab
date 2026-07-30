import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireGymPortalOwnerManage } from "@/lib/gym-portal-access";
import { GymStaffCreateForm } from "@/components/domain/gym-staff/GymStaffCreateForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymStaffNewPage() {
  const actor = await requireActor();

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  try {
    await requireGymPortalOwnerManage(actor);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/staff"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 선생님 목록
          </Link>
          <h1 className={matchonPageTitleClass}>선생님 등록</h1>
          <p className={matchonPageDescClass}>
            선생님 기본 정보를 등록합니다. 로그인 계정은 등록 후 설정 링크로
            만듭니다.
          </p>
        </div>

        <GymStaffCreateForm />
      </div>
    </div>
  );
}
