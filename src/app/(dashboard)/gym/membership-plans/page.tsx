import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import {
  GymMembershipPlanManager,
  type GymMembershipPlanRow,
} from "@/components/domain/gym-members/GymMembershipPlanManager";
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

export default async function GymMembershipPlansPage() {
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

  const plans = await gymMembershipPlanService.listPlans(actor, true);
  const rows: GymMembershipPlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    durationType: p.durationType,
    durationValue: p.durationValue,
    price: p.price,
    description: p.description,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
    activeSubscriptionCount: p._count.subscriptions,
  }));

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/members"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 전체 회원
          </Link>
          <h1 className={matchonPageTitleClass}>이용권 관리</h1>
          <p className={matchonPageDescClass}>
            회원에게 배정할 이용권(기간·가격)을 등록·수정합니다.
          </p>
        </div>

        <GymMembershipPlanManager plans={rows} />
      </div>
    </div>
  );
}
