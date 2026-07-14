import Link from "next/link";
import { MemberGymManualApplicationForm } from "@/components/domain/member-gyms/MemberGymManualApplicationForm";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";

export const dynamic = "force-dynamic";

export default async function MemberGymManualApplicationNewPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { settings } = await memberGymService.getSettings(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="회원사 직접 등록"
        description="종이 신청서나 방문 접수 내용을 직접 입력합니다."
      >
        <Link
          href="/organizer/member-gyms/applications"
          className="text-sm text-matchon-text-secondary underline"
        >
          가입 신청 목록
        </Link>
      </OrganizerDashboardPageHeader>
      <MemberGymSubNav />
      <div className="mt-4">
        <MemberGymManualApplicationForm
          settings={settings}
          actorName={actor.loginId || actor.email || actor.userId}
        />
      </div>
    </>
  );
}
