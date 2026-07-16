import { AssociationPublicLogoForm } from "@/components/domain/organizer/AssociationPublicLogoForm";
import { MemberGymSettingsForm } from "@/components/domain/member-gyms/MemberGymSettingsForm";
import { MemberGymSubNav } from "@/components/domain/member-gyms/MemberGymSubNav";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { memberGymService } from "@/lib/services/member-gym.service";
import { organizerPublicLogoService } from "@/lib/services/organizer-public-logo.service";

export const dynamic = "force-dynamic";

export default async function MemberGymSettingsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { settings } = await memberGymService.getSettings(actor);
  const logoSettings = await organizerPublicLogoService.getSettings(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="환경 설정"
        description="회원사 가입 링크·신청서·첨부·승인 정책과 협회 공개 로고 설정입니다."
      />
      <MemberGymSubNav />
      <div className="mt-4">
        <MemberGymSettingsForm initial={settings} />
        <AssociationPublicLogoForm
          initial={{
            logoUrl: logoSettings.logoUrl,
            publicLogoVisible: logoSettings.publicLogoVisible,
            websiteUrl: logoSettings.websiteUrl,
          }}
        />
      </div>
    </>
  );
}
