import { notFound } from "next/navigation";
import {
  AdminFighterCareerBackLink,
  AdminFighterCareerView,
} from "@/components/domain/admin/AdminFighterCareerView";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { adminService } from "@/lib/services/admin.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminFighterCareerPage({
  params,
}: {
  params: Promise<{ fighterId: string }>;
}) {
  const actor = await requireActor();
  const { fighterId } = await params;
  const profile = await adminService.getAdminFighterCareer(actor, fighterId);
  if (!profile) notFound();

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AdminPageHeader
            title="선수 Career"
            description={`${profile.name} · Archive 기반 공식 전적`}
          />
          <AdminFighterCareerBackLink />
        </div>
        <AdminFighterCareerView profile={profile} />
      </div>
    </div>
  );
}
