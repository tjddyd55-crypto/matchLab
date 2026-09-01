import Link from "next/link";
import { notFound } from "next/navigation";
import { FighterUnifiedCareerPanel } from "@/components/domain/fighters/career/FighterUnifiedCareerPanel";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { fighterUnifiedProfileService } from "@/lib/services/fighter-unified-profile.service";
import { memberGymService } from "@/lib/services/member-gym.service";

export const dynamic = "force-dynamic";

export default async function MemberGymFighterReadonlyPage({
  params,
}: {
  params: Promise<{ memberGymId: string; fighterId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { memberGymId, fighterId } = await params;

  let member;
  try {
    member = await memberGymService.getMemberGym(actor, memberGymId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  let profile;
  try {
    profile = await fighterUnifiedProfileService.loadForAssociation(
      actor,
      fighterId,
      memberGymId,
    );
  } catch (e) {
    if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) {
      notFound();
    }
    throw e;
  }

  return (
    <>
      <OrganizerDashboardPageHeader
        title={profile.identity.name}
        description={`회원사 「${member.gym.name}」 소속 선수 · 읽기 전용`}
      >
        <Link
          href={`/organizer/member-gyms/${memberGymId}`}
          className="text-sm text-matchon-primary underline"
        >
          회원사 상세
        </Link>
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4">
        <FighterUnifiedCareerPanel profile={profile} showIdentityMeta />
      </div>
    </>
  );
}
