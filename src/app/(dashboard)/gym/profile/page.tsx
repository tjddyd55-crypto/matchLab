import { GymProfileForm } from "@/components/domain/gym/GymProfileForm";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GymProfilePage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["gym", "admin"]);
  const access = await resolveGymPortalAccess(actor);
  if (!access.canEnterPortal) {
    redirect("/gym");
  }

  const gym = await prisma.gym.findUnique({
    where: { id: access.gymId },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      status: true,
    },
  });
  if (!gym) redirect("/gym");

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <h1 className={matchonPageTitleClass}>체육관 정보</h1>
        <p className={matchonPageDescClass}>
          연락처·주소만 수정할 수 있습니다. 체육관명·회원사 코드 등 주요 정보는
          협회 승인 영역입니다.
        </p>
        <GymProfileForm
          gym={gym}
          memberCode={access.memberGym?.memberCode ?? null}
          memberStatus={access.memberGym?.status ?? null}
          readOnly={false}
        />
      </div>
    </div>
  );
}
