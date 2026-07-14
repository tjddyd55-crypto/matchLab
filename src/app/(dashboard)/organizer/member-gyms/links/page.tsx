import { MemberGymJoinLinkCreateForm } from "@/components/domain/member-gyms/MemberGymJoinLinkCreateForm";
import { MemberGymJoinLinkTable } from "@/components/domain/member-gyms/MemberGymJoinLinkTable";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";

export const dynamic = "force-dynamic";

export default async function MemberGymLinksPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const links = await memberGymService.listLinks(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="가입 링크 관리"
        description="보조 관리 화면입니다. 평소에는 가입 신청 화면의 ‘가입 링크 복사’를 사용하세요. 토큰 원문은 DB에 저장하지 않습니다."
      />
      <MemberGymSubNav />
      <div className="mt-4 space-y-4">
        <MemberGymJoinLinkCreateForm />
        <MemberGymJoinLinkTable links={links} />
      </div>
    </>
  );
}
