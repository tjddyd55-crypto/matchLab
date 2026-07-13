import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { applicationService } from "@/lib/services/application.service";
import { GymApplicationsCards } from "@/components/domain/applications/GymApplicationsCards";
import { GymApplicationsTable } from "@/components/domain/applications/GymApplicationsTable";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
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

export default async function GymApplicationsPage() {
  const actor = await requireActor();
  const items = await applicationService.listGymApplications(actor);

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <header className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>신청 내역</h1>
          <p className={matchonPageDescClass}>
            참가비 계좌번호는 로그인한 체육관 화면의 입금 안내에서만 확인할 수 있습니다.
          </p>
        </header>

        {items.length === 0 ? (
          <MatchonEmptyState
            title="신청 내역이 없습니다"
            description="신청 가능한 대회에서 소속 선수를 선택해 신청해 보세요."
            action={
              <Link
                href="/gym/events"
                className={cn(
                  buttonVariants({ variant: "default", size: "field" }),
                  "inline-flex",
                )}
              >
                대회 목록에서 신청하기
              </Link>
            }
          />
        ) : (
          <>
            <GymApplicationsTable items={items} />
            <GymApplicationsCards items={items} />
          </>
        )}
      </div>
    </div>
  );
}
