import { MemberGymSettingsForm } from "@/components/domain/member-gyms/MemberGymSettingsForm";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";

export const dynamic = "force-dynamic";

export default async function MemberGymSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { settings } = await memberGymService.getSettings(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="환경 설정"
        description="회원사 가입 링크·신청서·첨부·승인 정책의 최소 설정입니다."
      />
      <MemberGymSubNav />
      <div className="mt-4">
        <MemberGymSettingsForm initial={settings} />
      </div>
    </>
  );
}
