import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { gymMemberProfileService } from "@/lib/services/gym-member-profile.service";
import { GymMemberCreateForm } from "@/components/domain/gym-members/GymMemberCreateForm";
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

export default async function GymMemberNewPage({
  searchParams,
}: {
  searchParams: Promise<{ asFighter?: string }>;
}) {
  const actor = await requireActor();
  const { asFighter } = await searchParams;
  const registerAsFighter = asFighter === "1" || asFighter === "true";

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const [plans, groups, profileCtx] = await Promise.all([
    gymMembershipPlanService.listPlans(actor, false),
    gymMemberGroupService.listGroups(actor, false),
    gymMemberProfileService.getGymFormContext(actor),
  ]);

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
          <h1 className={matchonPageTitleClass}>
            {registerAsFighter ? "회원·선수 등록" : "회원 등록"}
          </h1>
          <p className={matchonPageDescClass}>
            {registerAsFighter
              ? "회원 정보를 등록하면서 선수로도 함께 등록합니다."
              : "체육관 회원을 등록합니다. 이용권·결제는 선택 사항입니다."}
          </p>
        </div>

        <GymMemberCreateForm
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            durationType: p.durationType,
            durationValue: p.durationValue,
          }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          defaultRegisterAsFighter={registerAsFighter}
          sportTemplate={profileCtx.sportTemplate}
          customFields={profileCtx.customFields}
        />
      </div>
    </div>
  );
}
