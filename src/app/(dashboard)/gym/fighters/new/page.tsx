import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { GymFighterForm } from "@/components/domain/fighters/GymFighterForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymFighterNewPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const actor = await requireActor();
  const { returnTo } = await searchParams;
  if (actor.gymId) {
    const access = await resolveGymPortalAccess(actor);
    if (!access.canCreateFighter) {
      redirect("/gym/fighters");
    }
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/fighters"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 소속 선수
          </Link>
          <h1 className={matchonPageTitleClass}>선수 직접 등록</h1>
          <p className={matchonPageDescClass}>
            체육관 소속 선수 DB에 등록합니다. 서명·보호자 동의는 대회 신청 단계에서
            진행합니다.
          </p>
        </div>

        <GymFighterRegistrationPolicyNotice />

        {!actor.gymId ? (
          <GymProfileMissingBanner />
        ) : (
          <GymFighterForm
            mode="create"
            returnTo={returnTo?.startsWith("/gym/") ? returnTo : undefined}
          />
        )}
      </div>
    </div>
  );
}
