import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { applicationService } from "@/lib/services/application.service";
import { GymApplicationsCards } from "@/components/domain/applications/GymApplicationsCards";
import { GymApplicationsTable } from "@/components/domain/applications/GymApplicationsTable";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymApplicationsPage() {
  const actor = await requireActor();
  const items = await applicationService.listGymApplications(actor);

  if (!actor.gymId) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
        <GymProfileMissingBanner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          신청 내역
        </h1>
        <p className="text-muted-foreground text-sm">
          참가비 계좌번호는 로그인한 체육관 화면의 입금 안내에서만 확인할 수 있습니다.
        </p>
      </header>

      {items.length === 0 ? (
        <PublicApplicationEmptyState
          title="신청 내역이 없습니다"
          description="신청 가능한 대회에서 소속 선수를 선택해 신청해 보세요."
          tone="info"
          action={
            <Link
              href="/gym/events"
              className={cn(buttonVariants({ variant: "default", size: "field" }), "inline-flex")}
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
  );
}
