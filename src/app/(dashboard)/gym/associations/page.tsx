import { GymAssociationMembershipPanel } from "@/components/domain/gym/GymAssociationMembershipPanel";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { isGymPortalOwner } from "@/lib/permissions";
import { gymAssociationConnectionService } from "@/lib/services/gym-association-connection.service";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GymAssociationsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);
  const access = await resolveGymPortalAccess(actor);
  if (!access.canEnterPortal) {
    redirect("/gym");
  }

  const [memberships, availableAssociations] = await Promise.all([
    gymAssociationConnectionService.listMembershipsForGym(actor),
    gymAssociationConnectionService.listAvailableAssociations(actor),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <h1 className={matchonPageTitleClass}>가입 협회</h1>
        <p className={matchonPageDescClass}>
          체육관이 가입한 협회와 승인 대기 요청을 관리합니다. 협회 미가입
          상태에서도 체육관 기능을 사용할 수 있습니다.
        </p>
        <GymAssociationMembershipPanel
          memberships={memberships}
          availableAssociations={availableAssociations}
          canManage={isGymPortalOwner(actor) || actor.role === "admin"}
        />
      </div>
    </div>
  );
}
