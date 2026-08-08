import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { GymMemberGroupManager } from "@/components/domain/gym-members/GymMemberGroupManager";
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

export default async function GymMemberGroupsPage() {
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

  const groups = await gymMemberGroupService.listGroups(actor, true);

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
          <h1 className={matchonPageTitleClass}>회원 그룹 관리</h1>
          <p className={matchonPageDescClass}>
            성인·초등·오전반 등 체육관 맞춤 그룹을 만들고 회원에게 복수 배정할 수
            있습니다.
          </p>
        </div>
        <GymMemberGroupManager
          groups={groups.map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder,
            isActive: g.isActive,
            memberCount: g._count.assignments,
          }))}
        />
      </div>
    </div>
  );
}
