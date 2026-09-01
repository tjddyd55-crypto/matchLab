import { notFound } from "next/navigation";
import { AdminFighterCareerBackLink } from "@/components/domain/admin/AdminFighterCareerView";
import { FighterUnifiedCareerPanel } from "@/components/domain/fighters/career/FighterUnifiedCareerPanel";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { fighterUnifiedProfileService } from "@/lib/services/fighter-unified-profile.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminFighterCareerPage({
  params,
}: {
  params: Promise<{ fighterId: string }>;
}) {
  const actor = await requireActor();
  const { fighterId } = await params;

  let profile;
  try {
    profile = await fighterUnifiedProfileService.loadForAdmin(actor, fighterId);
  } catch {
    notFound();
  }

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AdminPageHeader
            title="선수 상세"
            description={`${profile.identity.name} · 공식 전적`}
          />
          <AdminFighterCareerBackLink />
        </div>
        <FighterUnifiedCareerPanel profile={profile} showIdentityMeta />
      </div>
    </div>
  );
}
