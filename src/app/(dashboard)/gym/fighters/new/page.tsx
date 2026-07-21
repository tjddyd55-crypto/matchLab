import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { GymFighterPromoteFromMember } from "@/components/domain/fighters/GymFighterPromoteFromMember";
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
  searchParams: Promise<{ q?: string; memberId?: string; returnTo?: string }>;
}) {
  const actor = await requireActor();
  const { q, memberId } = await searchParams;

  if (actor.gymId) {
    const access = await resolveGymPortalAccess(actor);
    if (!access.canCreateFighter) {
      redirect("/gym/fighters");
    }
  }

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const members = await gymMemberService.listPromotableMembers(
    actor,
    q?.trim() || undefined,
  );

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-2xl")}>
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
          <h1 className={matchonPageTitleClass}>선수 등록</h1>
          <p className={matchonPageDescClass}>
            기존 회원을 선수로 승격하거나, 새 회원·선수를 함께 등록합니다.
            서명·보호자 동의는 대회 신청 단계에서 진행합니다.
          </p>
        </div>

        <GymFighterRegistrationPolicyNotice />

        <GymFighterPromoteFromMember
          members={members.map((m) => ({
            id: m.id,
            memberNumber: m.memberNumber,
            name: m.name,
            phone: m.phone,
            birthDate: m.birthDate,
            gender: m.gender,
          }))}
          selectedMemberId={memberId}
          searchQ={q?.trim() || undefined}
        />
      </div>
    </div>
  );
}
